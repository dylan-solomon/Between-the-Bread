DROP FUNCTION public_usernames(UUID[]);

CREATE FUNCTION public_usernames(p_ids UUID[])
RETURNS TABLE (id UUID, username TEXT, is_admin BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
    SELECT p.id, p.username, p.is_admin
    FROM profiles p
    WHERE p.id = ANY (p_ids) AND p.username IS NOT NULL;
$$;

CREATE FUNCTION public_profile(p_username TEXT)
RETURNS TABLE (username TEXT, is_admin BOOLEAN, joined_at TIMESTAMPTZ, comment_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
    SELECT
        p.username,
        p.is_admin,
        p.created_at,
        (SELECT count(*) FROM comments c WHERE c.user_id = p.id AND c.is_approved)
    FROM profiles p
    WHERE lower(p.username) = lower(p_username);
$$;

CREATE FUNCTION user_id_for_username(p_username TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
    SELECT id FROM profiles WHERE lower(username) = lower(p_username);
$$;

REVOKE EXECUTE ON FUNCTION user_id_for_username(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION user_id_for_username(TEXT) TO service_role;

CREATE TABLE login_attempts (
    id           BIGSERIAL PRIMARY KEY,
    ip           TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_ip_time ON login_attempts (ip, attempted_at);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION record_login_attempt(p_ip TEXT, p_window_minutes INT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day';
    INSERT INTO login_attempts (ip) VALUES (p_ip);
    SELECT count(*) INTO v_count
    FROM login_attempts
    WHERE ip = p_ip AND attempted_at > now() - make_interval(mins => p_window_minutes);
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION record_login_attempt(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, INT) TO service_role;
