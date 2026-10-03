ALTER TABLE profiles ADD COLUMN username TEXT;

CREATE OR REPLACE FUNCTION username_problem(p_username TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN p_username IS NULL OR p_username !~ '^[A-Za-z0-9_]{3,20}$' THEN 'invalid'
        WHEN lower(p_username) = ANY (ARRAY[
            'admin', 'administrator', 'moderator', 'mod', 'staff', 'support', 'help', 'official',
            'system', 'root', 'owner', 'betweenthebread', 'between_the_bread', 'btb',
            'anonymous', 'deleted', 'null', 'undefined', 'everyone', 'me'
        ]) THEN 'reserved'
        ELSE NULL
    END;
$$;

ALTER TABLE profiles ADD CONSTRAINT profiles_username_allowed
    CHECK (username IS NULL OR username_problem(username) IS NULL);

CREATE UNIQUE INDEX idx_profiles_username_lower ON profiles (lower(username));

GRANT UPDATE (username) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION username_status(p_username TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
    SELECT COALESCE(
        username_problem(p_username),
        CASE
            WHEN EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(p_username)) THEN 'taken'
            ELSE 'available'
        END
    );
$$;

CREATE OR REPLACE FUNCTION public_usernames(p_ids UUID[])
RETURNS TABLE (id UUID, username TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
    SELECT p.id, p.username
    FROM profiles p
    WHERE p.id = ANY (p_ids) AND p.username IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_username TEXT := NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), '');
BEGIN
    BEGIN
        INSERT INTO public.profiles (id, username) VALUES (NEW.id, v_username);
    EXCEPTION WHEN unique_violation OR check_violation THEN
        INSERT INTO public.profiles (id) VALUES (NEW.id);
    END;
    RETURN NEW;
END;
$$;
