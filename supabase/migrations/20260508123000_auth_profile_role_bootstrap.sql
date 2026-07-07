-- =============================================================================
-- Auth Profile And Role Bootstrap
-- =============================================================================
-- Creates a minimal profile and base user role for new Supabase Auth users.
--
-- This is intentionally conservative: it links users to the first active
-- organization until invite-based onboarding is implemented. It keeps RAI
-- Learning System progress/enrollment usable during early development while
-- preserving the shared profiles/user_roles model.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id
    INTO v_org_id
    FROM public.organizations
   ORDER BY created_at ASC NULLS LAST, id ASC
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create profile for %, no organization exists', NEW.id;
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        org_id = COALESCE(public.profiles.org_id, EXCLUDED.org_id),
        is_active = true,
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

-- Backfill existing auth users created before this trigger was installed.
WITH default_org AS (
  SELECT id AS org_id
    FROM public.organizations
   ORDER BY created_at ASC NULLS LAST, id ASC
   LIMIT 1
),
upserted_profiles AS (
  INSERT INTO public.profiles (
    id,
    org_id,
    email,
    full_name,
    is_active
  )
  SELECT
    u.id,
    o.org_id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    true
  FROM auth.users u
  CROSS JOIN default_org o
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        org_id = COALESCE(public.profiles.org_id, EXCLUDED.org_id),
        is_active = true,
        updated_at = now()
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
FROM upserted_profiles
ON CONFLICT (user_id, org_id, role) DO NOTHING;
