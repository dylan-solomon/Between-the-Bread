CREATE TABLE compat_matrix (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_a    TEXT NOT NULL,
    group_b    TEXT NOT NULL,
    affinity   NUMERIC(3,2) NOT NULL CHECK (affinity >= 0 AND affinity <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(group_a, group_b)
);

ALTER TABLE compat_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compat matrix is publicly readable"
    ON compat_matrix FOR SELECT
    USING (true);

CREATE INDEX idx_compat_matrix_groups
    ON compat_matrix(group_a, group_b);
