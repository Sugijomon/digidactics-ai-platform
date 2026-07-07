-- =============================================================================
-- Auth Profile And Role Bootstrap
-- =============================================================================
-- Live-safe profile bootstrap for Supabase Auth users.
--
-- This migration intentionally does not assign users to the oldest organization,
-- does not reactivate existing profiles, and does not overwrite existing profile
-- e-mail/name values. Organization assignment must come from trusted invite or
-- onboarding metadata until a full invite workflow is available.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.try_parse_uuid(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;

  RETURN p_value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.try_parse_uuid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_parse_uuid(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_full_name text;
BEGIN
  v_org_id := COALESCE(
    public.try_parse_uuid(NEW.raw_app_meta_data->>'org_id'),
    public.try_parse_uuid(NEW.raw_user_meta_data->>'org_id')
  );
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  IF v_org_id IS NULL THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      is_active
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      true
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org_id) THEN
    RAISE EXCEPTION 'Cannot create profile for %, organization % does not exist', NEW.id, v_org_id;
  END IF;

  INSERT INTO public.profiles (
    id,
    org_id,
    email,
    full_name,
    is_active
  )
  VALUES (
    NEW.id,
    v_org_id,
    NEW.email,
    v_full_name,
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET org_id = COALESCE(public.profiles.org_id, EXCLUDED.org_id),
        updated_at = now();

  INSERT INTO public.user_roles (
    user_id,
    org_id,
    role
  )
  VALUES (
    NEW.id,
    v_org_id,
    'user'
  )
  ON CONFLICT (user_id, org_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;

CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill existing auth users only when no profile exists yet.
-- Existing live profiles are deliberately left untouched.
WITH auth_users_without_profile AS (
  SELECT
    u.id,
    public.try_parse_uuid(u.raw_app_meta_data->>'org_id') AS app_org_id,
    public.try_parse_uuid(u.raw_user_meta_data->>'org_id') AS user_org_id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS full_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
),
inserted_profiles AS (
  INSERT INTO public.profiles (
    id,
    org_id,
    email,
    full_name,
    is_active
  )
  SELECT
    u.id,
    COALESCE(u.app_org_id, u.user_org_id),
    u.email,
    u.full_name,
    true
  FROM auth_users_without_profile u
  WHERE COALESCE(u.app_org_id, u.user_org_id) IS NULL
     OR EXISTS (
       SELECT 1
       FROM public.organizations o
       WHERE o.id = COALESCE(u.app_org_id, u.user_org_id)
     )
  ON CONFLICT (id) DO NOTHING
  RETURNING id, org_id
)
INSERT INTO public.user_roles (
  user_id,
  org_id,
  role
)
SELECT
  id,
  org_id,
  'user'
FROM inserted_profiles
WHERE org_id IS NOT NULL
ON CONFLICT (user_id, org_id, role) DO NOTHING;
