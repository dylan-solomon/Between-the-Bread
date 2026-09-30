CREATE TABLE sandwich_database (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL,
    slug                  TEXT NOT NULL UNIQUE,
    description           TEXT,
    history               TEXT,
    origin_country        TEXT,
    origin_region         TEXT CHECK (origin_region IN ('Americas', 'Europe', 'Asia', 'Middle East', 'Africa', 'Oceania', 'Global')),
    canonical_ingredients JSONB NOT NULL DEFAULT '{}'::jsonb,
    dietary_tags          TEXT[] NOT NULL DEFAULT '{}',
    image_url             TEXT,
    avg_rating            NUMERIC(3,2),
    rating_count          INTEGER NOT NULL DEFAULT 0,
    search_vector         TSVECTOR,
    published             BOOLEAN NOT NULL DEFAULT false,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sandwich_database_search
    ON sandwich_database USING GIN(search_vector);

CREATE INDEX idx_sandwich_database_published_name
    ON sandwich_database(name)
    WHERE published = true;

CREATE INDEX idx_sandwich_database_region
    ON sandwich_database(origin_region)
    WHERE published = true;

CREATE OR REPLACE FUNCTION sandwich_database_search_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin_country, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin_region, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.history, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sandwich_database_search_trigger
    BEFORE INSERT OR UPDATE ON sandwich_database
    FOR EACH ROW EXECUTE FUNCTION sandwich_database_search_update();

ALTER TABLE sandwich_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published sandwiches are publicly readable"
    ON sandwich_database FOR SELECT
    USING (published = true);

CREATE POLICY "Admins can read all sandwiches"
    ON sandwich_database FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert sandwiches"
    ON sandwich_database FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update sandwiches"
    ON sandwich_database FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

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
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER ratings_refresh_aggregate
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW EXECUTE FUNCTION refresh_rating_aggregate();
