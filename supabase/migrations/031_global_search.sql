BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION ingredient_names_text(p_composition JSONB)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT COALESCE(string_agg(item ->> 'name', ' '), '')
    FROM jsonb_each(
        CASE WHEN jsonb_typeof(p_composition) = 'object' THEN p_composition ELSE '{}'::jsonb END
    ) entry
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(entry.value) = 'array' THEN entry.value ELSE '[]'::jsonb END
    ) item;
$$;

CREATE OR REPLACE FUNCTION sandwich_database_search_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.alternative_names, ' '), '')), 'A') ||
        setweight(to_tsvector('english', ingredient_names_text(NEW.canonical_ingredients)), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin_country, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin_region, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.history, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE sandwich_database SET canonical_ingredients = canonical_ingredients;

ALTER TABLE community_sandwiches ADD COLUMN search_vector TSVECTOR;

CREATE OR REPLACE FUNCTION community_sandwiches_search_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.fun_name, '')), 'A') ||
        setweight(to_tsvector('english', ingredient_names_text(NEW.composition)), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_sandwiches_search_trigger
    BEFORE INSERT OR UPDATE OF name, fun_name, composition ON community_sandwiches
    FOR EACH ROW EXECUTE FUNCTION community_sandwiches_search_update();

UPDATE community_sandwiches SET name = name;

CREATE INDEX idx_community_search ON community_sandwiches USING GIN (search_vector);
CREATE INDEX idx_sandwich_database_name_trgm ON sandwich_database USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX idx_community_name_trgm ON community_sandwiches USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX idx_blog_posts_title_trgm ON blog_posts USING GIN (lower(title) gin_trgm_ops);

CREATE OR REPLACE FUNCTION search_query(p_query TEXT)
RETURNS tsquery
LANGUAGE sql IMMUTABLE AS $$
    SELECT to_tsquery('english', string_agg(word || ':*', ' & '))
    FROM regexp_split_to_table(lower(trim(COALESCE(p_query, ''))), '[^[:alnum:]]+') word
    WHERE word <> '';
$$;

CREATE OR REPLACE FUNCTION name_match_score(p_name TEXT, p_query TEXT)
RETURNS REAL
LANGUAGE sql IMMUTABLE
SET search_path = public, extensions AS $$
    SELECT (
        CASE
            WHEN lower(p_name) = lower(p_query) THEN 3
            WHEN lower(p_name) LIKE lower(p_query) || '%' THEN 2.5
            WHEN strpos(lower(p_name), lower(p_query)) > 0 THEN 2
            ELSE 0
        END + similarity(lower(p_name), lower(p_query))
    )::REAL;
$$;

CREATE OR REPLACE FUNCTION search_public(
    p_query TEXT,
    p_source TEXT,
    p_require TEXT[],
    p_avoid TEXT[],
    p_limit INT,
    p_offset INT
)
RETURNS JSONB
LANGUAGE sql STABLE
SET search_path = public, extensions AS $$
    WITH input AS (
        SELECT trim(p_query) AS q, search_query(p_query) AS tsq,
               (cardinality(COALESCE(p_require, '{}')) + cardinality(COALESCE(p_avoid, '{}'))) > 0 AS diet_filtered
        WHERE length(trim(COALESCE(p_query, ''))) >= 2
    ),
    database_matches AS (
        SELECT
            'database'::TEXT AS source,
            d.slug,
            d.name AS title,
            GREATEST(
                name_match_score(d.name, i.q),
                COALESCE((SELECT max(name_match_score(alt, i.q)) FROM unnest(d.alternative_names) alt), 0)
            ) + COALESCE(ts_rank(d.search_vector, i.tsq), 0) AS score,
            jsonb_build_object(
                'description', d.description,
                'image_url', d.image_url,
                'origin_country', d.origin_country,
                'alternative_names', d.alternative_names,
                'dietary_tags', d.dietary_tags,
                'avg_rating', d.avg_rating,
                'rating_count', d.rating_count
            ) AS details
        FROM sandwich_database d, input i
        WHERE d.published
          AND d.dietary_tags @> COALESCE(p_require, '{}')
          AND NOT (d.dietary_tags && COALESCE(p_avoid, '{}'))
          AND (
              (i.tsq IS NOT NULL AND d.search_vector @@ i.tsq)
              OR word_similarity(lower(i.q), lower(d.name)) >= 0.5
          )
    ),
    community_matches AS (
        SELECT
            'community'::TEXT AS source,
            c.slug,
            c.name AS title,
            GREATEST(name_match_score(c.name, i.q), name_match_score(COALESCE(c.fun_name, ''), i.q))
                + COALESCE(ts_rank(c.search_vector, i.tsq), 0) AS score,
            jsonb_build_object(
                'fun_name', c.fun_name,
                'composition', c.composition,
                'dietary_tags', c.dietary_tags,
                'generated_count', c.generated_count,
                'avg_rating', c.avg_rating,
                'rating_count', c.rating_count
            ) AS details
        FROM community_sandwiches c, input i
        WHERE c.dietary_tags @> COALESCE(p_require, '{}')
          AND NOT (c.dietary_tags && COALESCE(p_avoid, '{}'))
          AND (
              (i.tsq IS NOT NULL AND c.search_vector @@ i.tsq)
              OR word_similarity(lower(i.q), lower(c.name)) >= 0.5
          )
    ),
    blog_matches AS (
        SELECT
            'blog'::TEXT AS source,
            b.slug,
            b.title,
            name_match_score(b.title, i.q) + COALESCE(ts_rank(b.search_vector, i.tsq), 0) AS score,
            jsonb_build_object(
                'excerpt', b.excerpt,
                'cover_image_url', b.cover_image_url,
                'published_at', b.published_at,
                'reading_time_minutes', b.reading_time_minutes
            ) AS details
        FROM blog_posts b, input i
        WHERE NOT i.diet_filtered
          AND b.published
          AND b.published_at <= now()
          AND (
              (i.tsq IS NOT NULL AND b.search_vector @@ i.tsq)
              OR word_similarity(lower(i.q), lower(b.title)) >= 0.5
          )
    ),
    all_matches AS (
        SELECT * FROM database_matches
        UNION ALL SELECT * FROM community_matches
        UNION ALL SELECT * FROM blog_matches
    ),
    chosen AS (
        SELECT * FROM all_matches
        WHERE p_source = 'all' OR source = p_source
        ORDER BY score DESC, title, slug
        LIMIT p_limit OFFSET p_offset
    )
    SELECT jsonb_build_object(
        'results', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object('source', source, 'slug', slug, 'title', title, 'score', score, 'details', details)
                ORDER BY score DESC, title, slug
            ) FROM chosen),
            '[]'::jsonb
        ),
        'counts', jsonb_build_object(
            'database', (SELECT count(*) FROM all_matches WHERE source = 'database'),
            'community', (SELECT count(*) FROM all_matches WHERE source = 'community'),
            'blog', (SELECT count(*) FROM all_matches WHERE source = 'blog')
        )
    );
$$;

CREATE OR REPLACE FUNCTION search_saved(p_query TEXT, p_limit INT, p_offset INT)
RETURNS JSONB
LANGUAGE sql STABLE
SET search_path = public, extensions AS $$
    WITH input AS (
        SELECT trim(p_query) AS q, search_query(p_query) AS tsq
        WHERE length(trim(COALESCE(p_query, ''))) >= 2
    ),
    matches AS (
        SELECT
            s.id::TEXT AS slug,
            s.name AS title,
            name_match_score(s.name, i.q)
                + COALESCE(ts_rank(to_tsvector('english', s.name || ' ' || ingredient_names_text(s.composition)), i.tsq), 0) AS score,
            jsonb_build_object(
                'composition', s.composition,
                'rating', s.rating,
                'is_favorite', s.is_favorite,
                'created_at', s.created_at
            ) AS details
        FROM saved_sandwiches s, input i
        WHERE s.user_id = auth.uid()
          AND (
              (i.tsq IS NOT NULL AND to_tsvector('english', s.name || ' ' || ingredient_names_text(s.composition)) @@ i.tsq)
              OR word_similarity(lower(i.q), lower(s.name)) >= 0.5
          )
    ),
    chosen AS (
        SELECT * FROM matches ORDER BY score DESC, title, slug LIMIT p_limit OFFSET p_offset
    )
    SELECT jsonb_build_object(
        'results', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object('source', 'saved', 'slug', slug, 'title', title, 'score', score, 'details', details)
                ORDER BY score DESC, title, slug
            ) FROM chosen),
            '[]'::jsonb
        ),
        'count', (SELECT count(*) FROM matches)
    );
$$;

COMMIT;
