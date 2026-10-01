ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_target_type_check;

ALTER TABLE comments
    ADD CONSTRAINT comments_target_type_check
    CHECK (target_type IN ('database', 'community', 'blog'));

CREATE OR REPLACE FUNCTION delete_blog_post_dependents()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    DELETE FROM comments WHERE target_type = 'blog' AND target_id = OLD.id;
    RETURN OLD;
END;
$$;

CREATE TRIGGER blog_posts_delete_dependents
    AFTER DELETE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION delete_blog_post_dependents();
