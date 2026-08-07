-- This SECURITY DEFINER RPC enforces learner/admin identity, required page
-- completion and certificate evidence inside the function. Restore the
-- explicit caller grants intended by the Learning pilot-hardening migration.
REVOKE ALL ON FUNCTION public.learning_issue_certification_for_enrollment(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_issue_certification_for_enrollment(uuid)
  TO authenticated, service_role;
