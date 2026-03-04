CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    slug            TEXT NOT NULL UNIQUE,
    display_order   INTEGER NOT NULL,
    selection_type  TEXT NOT NULL CHECK (selection_type IN ('single', 'multi')),
    min_picks       INTEGER NOT NULL DEFAULT 1,
    max_picks       INTEGER NOT NULL DEFAULT 1,
    emoji           TEXT,
    color           TEXT,
    has_double_toggle BOOLEAN NOT NULL DEFAULT false,
    is_bonus        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly readable"
    ON categories FOR SELECT
    USING (true);
