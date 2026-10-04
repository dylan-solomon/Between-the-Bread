BEGIN;

CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_user_created ON photos (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_updated ON ratings (user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION enforce_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    IF (SELECT count(*) FROM comments
        WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute') >= 5 THEN
        RAISE EXCEPTION 'Too many comments. Please wait a minute.' USING ERRCODE = 'P0429';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER comments_rate_limit
    BEFORE INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION enforce_comment_rate_limit();

CREATE OR REPLACE FUNCTION enforce_photo_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    IF (SELECT count(*) FROM photos
        WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute') >= 3 THEN
        RAISE EXCEPTION 'Too many photos. Please wait a minute.' USING ERRCODE = 'P0429';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER photos_rate_limit
    BEFORE INSERT ON photos
    FOR EACH ROW EXECUTE FUNCTION enforce_photo_rate_limit();

CREATE OR REPLACE FUNCTION enforce_rating_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
    IF (SELECT count(*) FROM ratings
        WHERE user_id = NEW.user_id
          AND id IS DISTINCT FROM NEW.id
          AND updated_at > now() - interval '1 minute') >= 10 THEN
        RAISE EXCEPTION 'Too many ratings. Please wait a minute.' USING ERRCODE = 'P0429';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ratings_rate_limit
    BEFORE INSERT OR UPDATE OF score ON ratings
    FOR EACH ROW EXECUTE FUNCTION enforce_rating_rate_limit();

CREATE TABLE rate_limit_hits (
    id      BIGSERIAL PRIMARY KEY,
    bucket  TEXT NOT NULL,
    subject TEXT NOT NULL,
    hit_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_hits_lookup ON rate_limit_hits (bucket, subject, hit_at);
CREATE INDEX idx_rate_limit_hits_time ON rate_limit_hits (hit_at);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION hit_rate_limit(p_bucket TEXT, p_subject TEXT, p_limit INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM rate_limit_hits WHERE hit_at < now() - interval '1 hour';
    INSERT INTO rate_limit_hits (bucket, subject) VALUES (p_bucket, p_subject);
    SELECT count(*) INTO v_count
    FROM rate_limit_hits
    WHERE bucket = p_bucket
      AND subject = p_subject
      AND hit_at > now() - make_interval(secs => p_window_seconds);
    RETURN v_count <= p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION hit_rate_limit(TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION hit_rate_limit(TEXT, TEXT, INT, INT) TO service_role;

CREATE OR REPLACE FUNCTION refresh_comment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_comment_id UUID := COALESCE(NEW.comment_id, OLD.comment_id);
BEGIN
    UPDATE comments
    SET like_count = (SELECT count(*) FROM comment_likes WHERE comment_id = v_comment_id)
    WHERE id = v_comment_id;
    RETURN NULL;
END;
$$;

CREATE TRIGGER comment_likes_refresh_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION refresh_comment_like_count();

CREATE OR REPLACE FUNCTION refresh_comment_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_parent_id UUID := COALESCE(NEW.parent_id, OLD.parent_id);
BEGIN
    IF v_parent_id IS NOT NULL THEN
        UPDATE comments
        SET reply_count = (SELECT count(*) FROM comments WHERE parent_id = v_parent_id)
        WHERE id = v_parent_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER comments_refresh_reply_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION refresh_comment_reply_count();

CREATE OR REPLACE FUNCTION adjust_comment_like_count(p_comment_id UUID, p_delta INT)
RETURNS INT
LANGUAGE sql STABLE AS $$
    SELECT like_count FROM comments WHERE id = p_comment_id;
$$;

CREATE OR REPLACE FUNCTION adjust_comment_reply_count(p_comment_id UUID, p_delta INT)
RETURNS INT
LANGUAGE sql STABLE AS $$
    SELECT reply_count FROM comments WHERE id = p_comment_id;
$$;

UPDATE comments c
SET like_count = (SELECT count(*) FROM comment_likes l WHERE l.comment_id = c.id),
    reply_count = (SELECT count(*) FROM comments r WHERE r.parent_id = c.id);

COMMIT;
