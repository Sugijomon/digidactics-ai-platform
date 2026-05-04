-- =============================================================================
-- Supabase pgcrypto compatibility wrappers
-- =============================================================================
-- Supabase installs pgcrypto in the `extensions` schema. Some migration/runtime
-- SQL expects digest(...) and gen_random_bytes(...) to resolve from `public`.
-- These wrappers keep that resolution stable without granting direct use to
-- anon/authenticated clients.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.digest(data text, type text)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = extensions
AS $$
  SELECT extensions.digest(data, type);
$$;

CREATE OR REPLACE FUNCTION public.gen_random_bytes(count integer)
RETURNS bytea
LANGUAGE sql
VOLATILE
STRICT
PARALLEL SAFE
SET search_path = extensions
AS $$
  SELECT extensions.gen_random_bytes(count);
$$;

REVOKE ALL ON FUNCTION public.digest(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gen_random_bytes(integer) FROM PUBLIC, anon, authenticated;

