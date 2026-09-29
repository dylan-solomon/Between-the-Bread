ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$;

CREATE TABLE config (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config is publicly readable"
    ON config FOR SELECT
    USING (true);

CREATE POLICY "Admins can modify config"
    ON config FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

INSERT INTO config (key, value) VALUES
    ('cost_data_last_updated', '"2026-03-01"'),
    ('site_notice', 'null');

CREATE POLICY "Admins can read all ingredients"
    ON ingredients FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert ingredients"
    ON ingredients FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update ingredients"
    ON ingredients FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update compat matrix"
    ON compat_matrix FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admins can read all comments"
    ON comments FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any comment"
    ON comments FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admins can read all photos"
    ON photos FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can update any photo"
    ON photos FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());
