CREATE OR REPLACE FUNCTION move_ingredient_category(p_ingredient_id UUID, p_category_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public AS $$
DECLARE
    v_name     TEXT;
    v_old_slug TEXT;
    v_new_slug TEXT;
    v_updated  INTEGER;
BEGIN
    SELECT i.name, c.slug INTO v_name, v_old_slug
    FROM ingredients i
    JOIN categories c ON c.id = i.category_id
    WHERE i.id = p_ingredient_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ingredient not found.' USING ERRCODE = 'P0002';
    END IF;

    SELECT slug INTO v_new_slug FROM categories WHERE id = p_category_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Category not found.' USING ERRCODE = '23503';
    END IF;

    IF v_new_slug = v_old_slug THEN
        RETURN 0;
    END IF;

    UPDATE ingredients
    SET category_id = p_category_id, updated_at = now()
    WHERE id = p_ingredient_id;

    WITH affected AS (
        SELECT id, canonical_ingredients AS ci
        FROM sandwich_database
        WHERE EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(canonical_ingredients -> v_old_slug, '[]'::jsonb)) item
            WHERE lower(item ->> 'name') = lower(v_name)
        )
    ),
    rewritten AS (
        SELECT
            id,
            ci,
            (
                SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
                FROM jsonb_array_elements(ci -> v_old_slug) item
                WHERE lower(item ->> 'name') <> lower(v_name)
            ) AS remaining,
            EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(ci -> v_new_slug, '[]'::jsonb)) item
                WHERE lower(item ->> 'name') = lower(v_name)
            ) AS already_listed
        FROM affected
    )
    UPDATE sandwich_database s
    SET canonical_ingredients =
            (CASE WHEN r.remaining = '[]'::jsonb THEN r.ci - v_old_slug
                  ELSE jsonb_set(r.ci, ARRAY[v_old_slug], r.remaining) END)
            || jsonb_build_object(
                v_new_slug,
                CASE WHEN r.already_listed THEN r.ci -> v_new_slug
                     ELSE COALESCE(r.ci -> v_new_slug, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('name', v_name)) END
            ),
        updated_at = now()
    FROM rewritten r
    WHERE s.id = r.id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;
