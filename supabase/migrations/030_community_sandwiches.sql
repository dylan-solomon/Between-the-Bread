BEGIN;

CREATE TABLE community_sandwiches (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               TEXT NOT NULL UNIQUE,
    composition_hash   TEXT NOT NULL UNIQUE,
    composition        JSONB NOT NULL,
    name               TEXT NOT NULL,
    fun_name           TEXT,
    ingredient_slugs   TEXT[] NOT NULL,
    dietary_tags       TEXT[] NOT NULL DEFAULT '{}',
    generated_count    INT NOT NULL DEFAULT 0,
    avg_rating         NUMERIC(3,2),
    rating_count       INT NOT NULL DEFAULT 0,
    last_rated_at      TIMESTAMPTZ,
    first_generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_generated ON community_sandwiches (generated_count DESC);
CREATE INDEX idx_community_rating ON community_sandwiches (avg_rating DESC NULLS LAST, rating_count DESC);
CREATE INDEX idx_community_created ON community_sandwiches (created_at DESC);
CREATE INDEX idx_community_ingredients ON community_sandwiches USING GIN (ingredient_slugs);
CREATE INDEX idx_community_dietary ON community_sandwiches USING GIN (dietary_tags);

ALTER TABLE community_sandwiches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community sandwiches are publicly readable"
    ON community_sandwiches FOR SELECT
    USING (true);

CREATE TABLE community_sandwich_makers (
    community_sandwich_id UUID NOT NULL REFERENCES community_sandwiches(id) ON DELETE CASCADE,
    user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (community_sandwich_id, user_id)
);

ALTER TABLE community_sandwich_makers ENABLE ROW LEVEL SECURITY;

ALTER TABLE saved_sandwiches
    ADD COLUMN community_sandwich_id UUID REFERENCES community_sandwiches(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION community_composition(
    p_composition JSONB,
    OUT composition_key TEXT,
    OUT composition JSONB,
    OUT ingredient_slugs TEXT[],
    OUT dietary_tags TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
    WITH picked AS (
        SELECT DISTINCT entry.key AS category, item ->> 'slug' AS slug
        FROM jsonb_each(
            CASE WHEN jsonb_typeof(p_composition) = 'object' THEN p_composition ELSE '{}'::jsonb END
        ) entry
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(entry.value) = 'array' THEN entry.value ELSE '[]'::jsonb END
        ) item
    ),
    matched AS (
        SELECT picked.category, picked.slug, i.name, i.dietary_tags AS tags, c.display_order
        FROM picked
        LEFT JOIN categories c ON c.slug = picked.category
        LEFT JOIN ingredients i ON i.category_id = c.id AND i.slug = picked.slug
    ),
    usable AS (
        SELECT COALESCE(bool_and(name IS NOT NULL), false) AND COALESCE(bool_or(category = 'bread'), false) AS ok
        FROM matched
    )
    SELECT
        (SELECT string_agg(m.category || ':' || m.slug, '|' ORDER BY m.display_order, m.slug) FROM matched m),
        (
            SELECT jsonb_object_agg(grouped.category, grouped.items)
            FROM (
                SELECT m.category, jsonb_agg(jsonb_build_object('slug', m.slug, 'name', m.name) ORDER BY m.slug) AS items
                FROM matched m
                GROUP BY m.category
            ) grouped
        ),
        ARRAY(SELECT m.slug FROM matched m ORDER BY m.display_order, m.slug),
        ARRAY(
            SELECT tag FROM unnest(ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']) tag
            WHERE NOT EXISTS (SELECT 1 FROM matched m WHERE NOT (m.tags @> ARRAY[tag]))
        ) || ARRAY(
            SELECT tag FROM unnest(ARRAY['contains_pork', 'contains_shellfish', 'contains_peanuts']) tag
            WHERE EXISTS (SELECT 1 FROM matched m WHERE m.tags @> ARRAY[tag])
        )
    FROM usable
    WHERE usable.ok;
$$;

CREATE OR REPLACE FUNCTION community_slug(p_name TEXT, p_hash TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT COALESCE(
        NULLIF(trim(BOTH '-' FROM left(regexp_replace(lower(COALESCE(p_name, '')), '[^a-z0-9]+', '-', 'g'), 60)), ''),
        'sandwich'
    ) || '-' || left(p_hash, 8);
$$;

CREATE OR REPLACE FUNCTION record_community_make(
    p_composition JSONB,
    p_name TEXT,
    p_user_id UUID,
    p_made_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_parts RECORD;
    v_hash TEXT;
    v_name TEXT;
    v_id UUID;
    v_new_maker INT;
BEGIN
    SELECT * INTO v_parts FROM community_composition(p_composition);
    IF v_parts.composition_key IS NULL THEN
        RETURN NULL;
    END IF;

    v_hash := md5(v_parts.composition_key);
    v_name := COALESCE(NULLIF(trim(p_name), ''), 'Sandwich');

    INSERT INTO community_sandwiches (
        slug, composition_hash, composition, name, ingredient_slugs, dietary_tags, created_at, updated_at
    )
    VALUES (
        community_slug(v_name, v_hash), v_hash, v_parts.composition, v_name,
        v_parts.ingredient_slugs, v_parts.dietary_tags, p_made_at, p_made_at
    )
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_id FROM community_sandwiches WHERE composition_hash = v_hash;
    IF v_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF p_user_id IS NULL THEN
        UPDATE community_sandwiches
        SET generated_count = generated_count + 1, updated_at = now()
        WHERE id = v_id;
        RETURN v_id;
    END IF;

    INSERT INTO community_sandwich_makers (community_sandwich_id, user_id)
    VALUES (v_id, p_user_id)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_new_maker = ROW_COUNT;

    IF v_new_maker > 0 THEN
        UPDATE community_sandwiches
        SET generated_count = generated_count + 1,
            first_generated_by = COALESCE(first_generated_by, p_user_id),
            updated_at = now()
        WHERE id = v_id;
    END IF;

    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION community_composition(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION record_community_make(JSONB, TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION ratings_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER ratings_touch_updated_at
    BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION ratings_touch_updated_at();

CREATE OR REPLACE FUNCTION refresh_rating_aggregate()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    affected_type TEXT;
    affected_id   UUID;
BEGIN
    affected_type := COALESCE(NEW.target_type, OLD.target_type);
    affected_id   := COALESCE(NEW.target_id, OLD.target_id);

    IF affected_type = 'database' THEN
        UPDATE sandwich_database
        SET avg_rating   = (SELECT ROUND(AVG(score)::numeric, 2) FROM ratings WHERE target_type = 'database' AND target_id = affected_id),
            rating_count = (SELECT COUNT(*) FROM ratings WHERE target_type = 'database' AND target_id = affected_id)
        WHERE id = affected_id;
    ELSIF affected_type = 'community' THEN
        UPDATE community_sandwiches
        SET avg_rating    = (SELECT ROUND(AVG(score)::numeric, 2) FROM ratings WHERE target_type = 'community' AND target_id = affected_id),
            rating_count  = (SELECT COUNT(*) FROM ratings WHERE target_type = 'community' AND target_id = affected_id),
            last_rated_at = (SELECT MAX(updated_at) FROM ratings WHERE target_type = 'community' AND target_id = affected_id)
        WHERE id = affected_id;
    END IF;

    RETURN NULL;
END;
$$;

DO $$
DECLARE
    made RECORD;
BEGIN
    FOR made IN
        SELECT 'share' AS kind, s.id, s.composition, s.name, NULL::UUID AS user_id, s.created_at
        FROM shared_sandwiches s
        UNION ALL
        SELECT 'save', v.id, v.composition, v.name, v.user_id, v.created_at
        FROM saved_sandwiches v
        ORDER BY created_at
    LOOP
        IF made.kind = 'save' THEN
            UPDATE saved_sandwiches
            SET community_sandwich_id = record_community_make(made.composition, made.name, made.user_id, made.created_at)
            WHERE id = made.id;
        ELSE
            PERFORM record_community_make(made.composition, made.name, NULL, made.created_at);
        END IF;
    END LOOP;
END;
$$;

INSERT INTO ratings (user_id, target_type, target_id, score, created_at, updated_at)
SELECT DISTINCT ON (v.user_id, v.community_sandwich_id)
    v.user_id, 'community', v.community_sandwich_id, v.rating, v.updated_at, v.updated_at
FROM saved_sandwiches v
WHERE v.rating IS NOT NULL AND v.community_sandwich_id IS NOT NULL
ORDER BY v.user_id, v.community_sandwich_id, v.updated_at DESC
ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

CREATE OR REPLACE FUNCTION community_record_share()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    BEGIN
        PERFORM record_community_make(NEW.composition, NEW.name, NULL, NEW.created_at);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Community leaderboard skipped a share: %', SQLERRM;
    END;
    RETURN NULL;
END;
$$;

CREATE TRIGGER shared_sandwiches_community
    AFTER INSERT ON shared_sandwiches
    FOR EACH ROW EXECUTE FUNCTION community_record_share();

CREATE OR REPLACE FUNCTION community_record_save()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    BEGIN
        NEW.community_sandwich_id := record_community_make(NEW.composition, NEW.name, NEW.user_id, NEW.created_at);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Community leaderboard skipped a save: %', SQLERRM;
        NEW.community_sandwich_id := NULL;
    END;
    RETURN NEW;
END;
$$;

CREATE TRIGGER saved_sandwiches_community
    BEFORE INSERT ON saved_sandwiches
    FOR EACH ROW EXECUTE FUNCTION community_record_save();

CREATE OR REPLACE FUNCTION community_sync_saved_rating()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    IF NEW.community_sandwich_id IS NULL THEN
        RETURN NULL;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.rating IS NOT DISTINCT FROM OLD.rating THEN
        RETURN NULL;
    END IF;

    BEGIN
        IF NEW.rating IS NULL THEN
            DELETE FROM ratings
            WHERE user_id = NEW.user_id AND target_type = 'community' AND target_id = NEW.community_sandwich_id;
        ELSE
            INSERT INTO ratings (user_id, target_type, target_id, score)
            VALUES (NEW.user_id, 'community', NEW.community_sandwich_id, NEW.rating)
            ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET score = EXCLUDED.score;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Community rating not synced: %', SQLERRM;
    END;
    RETURN NULL;
END;
$$;

CREATE TRIGGER saved_sandwiches_community_rating
    AFTER INSERT OR UPDATE OF rating ON saved_sandwiches
    FOR EACH ROW EXECUTE FUNCTION community_sync_saved_rating();

CREATE OR REPLACE FUNCTION community_leaderboard(
    p_sort TEXT,
    p_require TEXT[],
    p_avoid TEXT[],
    p_ingredient TEXT,
    p_limit INT,
    p_offset INT
)
RETURNS TABLE (
    id UUID,
    slug TEXT,
    name TEXT,
    fun_name TEXT,
    composition JSONB,
    dietary_tags TEXT[],
    generated_count INT,
    avg_rating NUMERIC,
    rating_count INT,
    created_at TIMESTAMPTZ,
    rank BIGINT,
    total_count BIGINT
)
LANGUAGE sql STABLE
SET search_path = public AS $$
    WITH filtered AS (
        SELECT
            c.*,
            CASE
                WHEN c.last_rated_at IS NULL OR c.avg_rating IS NULL THEN 0
                ELSE (c.rating_count * c.avg_rating) / (EXTRACT(EPOCH FROM now() - c.last_rated_at) / 86400 + 2)
            END AS trending_score
        FROM community_sandwiches c
        WHERE c.dietary_tags @> COALESCE(p_require, '{}')
          AND NOT (c.dietary_tags && COALESCE(p_avoid, '{}'))
          AND (p_ingredient IS NULL OR c.ingredient_slugs @> ARRAY[p_ingredient])
    ),
    ranked AS (
        SELECT
            f.*,
            row_number() OVER (
                ORDER BY
                    CASE WHEN p_sort = 'top_rated' THEN f.avg_rating END DESC NULLS LAST,
                    CASE WHEN p_sort = 'top_rated' THEN f.rating_count END DESC,
                    CASE WHEN p_sort = 'most_popular' THEN f.generated_count END DESC,
                    CASE WHEN p_sort = 'trending' THEN f.trending_score END DESC,
                    CASE WHEN p_sort = 'newest' THEN f.created_at END DESC,
                    f.generated_count DESC,
                    f.created_at DESC,
                    f.id
            ) AS rank,
            count(*) OVER () AS total_count
        FROM filtered f
    )
    SELECT r.id, r.slug, r.name, r.fun_name, r.composition, r.dietary_tags, r.generated_count,
           r.avg_rating, r.rating_count, r.created_at, r.rank, r.total_count
    FROM ranked r
    ORDER BY r.rank
    LIMIT p_limit OFFSET p_offset;
$$;

COMMIT;
