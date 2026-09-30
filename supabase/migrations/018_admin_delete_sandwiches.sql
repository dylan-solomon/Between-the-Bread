CREATE POLICY "Admins can delete sandwiches"
    ON sandwich_database FOR DELETE
    USING (is_admin());

CREATE OR REPLACE FUNCTION delete_sandwich_dependents()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    DELETE FROM ratings  WHERE target_type = 'database' AND target_id = OLD.id;
    DELETE FROM comments WHERE target_type = 'database' AND target_id = OLD.id;
    DELETE FROM photos   WHERE target_type = 'database' AND target_id = OLD.id;
    RETURN OLD;
END;
$$;

CREATE TRIGGER sandwich_database_delete_dependents
    AFTER DELETE ON sandwich_database
    FOR EACH ROW EXECUTE FUNCTION delete_sandwich_dependents();
