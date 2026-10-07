BEGIN;

CREATE OR REPLACE FUNCTION community_name(p_composition JSONB, p_supplied TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    WITH items AS (
        SELECT entry.key AS category, item ->> 'slug' AS slug, item ->> 'name' AS name
        FROM jsonb_each(
            CASE WHEN jsonb_typeof(p_composition) = 'object' THEN p_composition ELSE '{}'::jsonb END
        ) entry
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(entry.value) = 'array' THEN entry.value ELSE '[]'::jsonb END
        ) item
        WHERE item ->> 'name' IS NOT NULL
    ),
    bread AS (
        SELECT name FROM items WHERE category = 'bread' ORDER BY slug LIMIT 1
    ),
    protein AS (
        SELECT slug, name FROM items WHERE category = 'protein'
    ),
    cheese AS (
        SELECT slug, name FROM items WHERE category = 'cheese' AND slug <> 'no-cheese'
    ),
    fillings AS (
        SELECT p.name || COALESCE(' & ' || c.name, '') AS label, p.slug AS protein_slug, c.slug AS cheese_slug
        FROM protein p
        LEFT JOIN cheese c ON true
        UNION ALL
        SELECT c.name, NULL, c.slug
        FROM cheese c
        WHERE NOT EXISTS (SELECT 1 FROM protein)
    ),
    allowed AS (
        SELECT f.label || ' on ' || b.name AS name,
               ROW_NUMBER() OVER (ORDER BY f.protein_slug, f.cheese_slug) AS position
        FROM fillings f
        CROSS JOIN bread b
    )
    SELECT COALESCE(
        (SELECT name FROM allowed WHERE name = trim(p_supplied) LIMIT 1),
        (SELECT name FROM allowed ORDER BY position LIMIT 1),
        (SELECT 'Sandwich on ' || name FROM bread),
        'Sandwich'
    );
$$;

REVOKE EXECUTE ON FUNCTION community_name(JSONB, TEXT) FROM PUBLIC, anon, authenticated;

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
    v_name := community_name(v_parts.composition, p_name);

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

REVOKE EXECUTE ON FUNCTION record_community_make(JSONB, TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

UPDATE community_sandwiches
SET name = community_name(composition, name),
    slug = community_slug(community_name(composition, name), composition_hash)
WHERE name IS DISTINCT FROM community_name(composition, name);

COMMIT;
