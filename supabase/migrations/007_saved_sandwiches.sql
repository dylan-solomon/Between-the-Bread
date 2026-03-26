CREATE TABLE saved_sandwiches (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    composition          JSONB NOT NULL,
    name                 TEXT NOT NULL,
    total_estimated_cost JSONB,
    total_nutrition      JSONB,
    rating               INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_favorite          BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_sandwiches_user_created
    ON saved_sandwiches(user_id, created_at DESC);

CREATE INDEX idx_saved_sandwiches_user_favorites
    ON saved_sandwiches(user_id, is_favorite)
    WHERE is_favorite = true;

CREATE INDEX idx_saved_sandwiches_rating
    ON saved_sandwiches(user_id, rating)
    WHERE rating IS NOT NULL;

ALTER TABLE saved_sandwiches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sandwiches"
    ON saved_sandwiches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can save sandwiches"
    ON saved_sandwiches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sandwiches"
    ON saved_sandwiches FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sandwiches"
    ON saved_sandwiches FOR DELETE
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION enforce_sandwich_limit()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM saved_sandwiches
    WHERE id IN (
        SELECT id FROM saved_sandwiches
        WHERE user_id = NEW.user_id
        AND is_favorite = false
        ORDER BY created_at DESC
        OFFSET 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_saved_sandwich_limit
    AFTER INSERT ON saved_sandwiches
    FOR EACH ROW EXECUTE FUNCTION enforce_sandwich_limit();
