CREATE TABLE ratings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('database', 'community')),
    target_id   UUID NOT NULL,
    score       SMALLINT NOT NULL CHECK (score >= 1 AND score <= 5),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ratings_user_target
    ON ratings(user_id, target_type, target_id);

CREATE INDEX idx_ratings_target
    ON ratings(target_type, target_id);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are publicly readable"
    ON ratings FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert own ratings"
    ON ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
    ON ratings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
    ON ratings FOR DELETE
    USING (auth.uid() = user_id);
