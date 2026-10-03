REVOKE UPDATE ON profiles FROM anon, authenticated;

GRANT UPDATE (display_name, dietary_filters, smart_mode_default, double_protein, double_cheese, cost_context, updated_at)
    ON profiles TO authenticated;

DROP POLICY "Authenticated users can insert photos" ON photos;

CREATE POLICY "Authenticated users can insert photos"
    ON photos FOR INSERT
    WITH CHECK (auth.uid() = user_id AND is_approved = false);

DROP POLICY "Authenticated users can insert comments" ON comments;

CREATE POLICY "Authenticated users can insert comments"
    ON comments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND is_flagged = false
        AND is_approved = true
        AND like_count = 0
        AND reply_count = 0
    );
