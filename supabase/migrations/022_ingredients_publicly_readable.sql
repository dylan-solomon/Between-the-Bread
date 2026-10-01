DROP POLICY "Enabled ingredients are publicly readable" ON ingredients;

CREATE POLICY "Ingredients are publicly readable"
    ON ingredients FOR SELECT
    USING (true);
