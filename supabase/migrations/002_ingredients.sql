CREATE TABLE ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID NOT NULL REFERENCES categories(id),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    dietary_tags    TEXT[] NOT NULL DEFAULT '{}',
    compat_group    TEXT,
    estimated_cost  JSONB,
    nutrition       JSONB,
    image_asset     TEXT,
    is_trigger      BOOLEAN NOT NULL DEFAULT false,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(category_id, slug)
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enabled ingredients are publicly readable"
    ON ingredients FOR SELECT
    USING (enabled = true);

CREATE INDEX idx_ingredients_category_enabled
    ON ingredients(category_id, enabled);

CREATE INDEX idx_ingredients_dietary_tags
    ON ingredients USING GIN(dietary_tags);
