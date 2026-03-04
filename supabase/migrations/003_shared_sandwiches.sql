CREATE TABLE shared_sandwiches (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash                 TEXT NOT NULL UNIQUE,
    composition          JSONB NOT NULL,
    name                 TEXT NOT NULL,
    total_estimated_cost JSONB,
    total_nutrition      JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at           TIMESTAMPTZ
);

ALTER TABLE shared_sandwiches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared sandwiches are publicly readable"
    ON shared_sandwiches FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create shared sandwiches"
    ON shared_sandwiches FOR INSERT
    WITH CHECK (true);

CREATE UNIQUE INDEX idx_shared_sandwiches_hash
    ON shared_sandwiches(hash);

CREATE INDEX idx_shared_sandwiches_expires
    ON shared_sandwiches(expires_at)
    WHERE expires_at IS NOT NULL;
