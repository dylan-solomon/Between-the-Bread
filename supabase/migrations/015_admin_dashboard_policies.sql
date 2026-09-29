CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can read all saved sandwiches"
    ON saved_sandwiches FOR SELECT
    USING (is_admin());
