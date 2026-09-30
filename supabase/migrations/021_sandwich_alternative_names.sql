ALTER TABLE sandwich_database
    ADD COLUMN alternative_names TEXT[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION sandwich_database_search_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.alternative_names, ' '), '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin_country, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin_region, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.history, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE sandwich_database SET alternative_names = alternative_names;
