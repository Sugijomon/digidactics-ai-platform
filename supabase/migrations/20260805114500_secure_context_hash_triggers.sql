-- Allow authenticated learning writes to compute evidence hashes without
-- exposing the pgcrypto compatibility wrapper to client roles.
--
-- These functions are only used as triggers. Running them with the table
-- owner's privileges preserves the existing least-privilege boundary:
-- learners can insert rows allowed by RLS, while digest() remains revoked.

BEGIN;

ALTER FUNCTION public.prepare_learning_context_pack_release()
  SECURITY DEFINER
  SET search_path = public, pg_temp;

ALTER FUNCTION public.pin_learning_page_attempt_context()
  SECURITY DEFINER
  SET search_path = public, pg_temp;

ALTER FUNCTION public.pin_learning_certification_context()
  SECURITY DEFINER
  SET search_path = public, pg_temp;

ALTER FUNCTION public.validate_learning_certification_attempt_versions()
  SECURITY DEFINER
  SET search_path = public, pg_temp;

ALTER FUNCTION public.set_platform_event_hash()
  SECURITY DEFINER
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.prepare_learning_context_pack_release()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_learning_page_attempt_context()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_learning_certification_context()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_learning_certification_attempt_versions()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_platform_event_hash()
  FROM PUBLIC, anon, authenticated;

COMMIT;
