CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
    SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$;
