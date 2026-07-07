-- =============================================================================
-- RouteAI Learning System: certification and access gate
-- =============================================================================
-- Purpose:
--   Turn AI Literacy completion into an auditable RouteAI access criterion.
--   This migration does not connect SAI scan outputs to the Learning System.
-- =============================================================================

-- =============================================================================
-- 1. CERTIFICATIONS
-- =============================================================================

CREATE TABLE public.learning_certifications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id             uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE RESTRICT,
  enrollment_id         uuid REFERENCES public.learning_course_enrollments(id) ON DELETE SET NULL,
  certification_code    text NOT NULL,
  status                text NOT NULL DEFAULT 'active',
  issued_at             timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz,
  revoked_at            timestamptz,
  revoked_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoke_reason         text,
  superseded_by_id      uuid REFERENCES public.learning_certifications(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_certifications_status_chk
    CHECK (status IN ('active', 'expired', 'revoked', 'superseded')),
  CONSTRAINT learning_certifications_expiry_chk
    CHECK (expires_at IS NULL OR expires_at > issued_at),
  CONSTRAINT learning_certifications_revoked_chk
    CHECK (
      (status = 'revoked' AND revoked_at IS NOT NULL)
      OR (status <> 'revoked' AND revoked_at IS NULL)
    )
);

CREATE UNIQUE INDEX learning_certifications_user_active_unique
  ON public.learning_certifications(org_id, user_id, certification_code)
  WHERE status = 'active';

CREATE INDEX learning_certifications_org_status_idx
  ON public.learning_certifications(org_id, status);

CREATE INDEX learning_certifications_user_status_idx
  ON public.learning_certifications(user_id, status);


-- =============================================================================
-- 2. ACCESS REQUIREMENTS
-- =============================================================================

CREATE TABLE public.learning_access_requirements (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                          uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability_code                 text NOT NULL,
  required_certification_code     text NOT NULL,
  required_course_id              uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE RESTRICT,
  title                           text NOT NULL,
  description                     text,
  validity_months                 int,
  is_active                       boolean NOT NULL DEFAULT true,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_access_requirements_validity_chk
    CHECK (validity_months IS NULL OR validity_months > 0),
  CONSTRAINT learning_access_requirements_capability_chk
    CHECK (length(trim(capability_code)) > 0),
  CONSTRAINT learning_access_requirements_certification_chk
    CHECK (length(trim(required_certification_code)) > 0)
);

CREATE UNIQUE INDEX learning_access_requirements_platform_unique
  ON public.learning_access_requirements(capability_code)
  WHERE org_id IS NULL AND is_active = true;

CREATE UNIQUE INDEX learning_access_requirements_org_unique
  ON public.learning_access_requirements(org_id, capability_code)
  WHERE org_id IS NOT NULL AND is_active = true;

CREATE INDEX learning_access_requirements_lookup_idx
  ON public.learning_access_requirements(capability_code, org_id)
  WHERE is_active = true;


-- =============================================================================
-- 3. UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_learning_certifications_updated
  BEFORE UPDATE ON public.learning_certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_access_requirements_updated
  BEFORE UPDATE ON public.learning_access_requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 4. RPC: ISSUE CERTIFICATION
-- =============================================================================
-- This is deliberately restricted to learning admins. Learners may complete
-- content, but the hard RouteAI gate should only trust a controlled server/admin
-- certification path until objective grading and completion rules are fully
-- enforced server-side.

CREATE OR REPLACE FUNCTION public.learning_issue_certification_for_enrollment(p_enrollment_id uuid)
RETURNS TABLE (
  certification_id uuid,
  certification_code text,
  status text,
  issued_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment public.learning_course_enrollments%ROWTYPE;
  v_requirement public.learning_access_requirements%ROWTYPE;
  v_cert_id uuid;
  v_issued_at timestamptz := now();
  v_expires_at timestamptz;
BEGIN
  SELECT *
    INTO v_enrollment
    FROM public.learning_course_enrollments
   WHERE id = p_enrollment_id;

  IF v_enrollment.id IS NULL THEN
    RAISE EXCEPTION 'learning enrollment % bestaat niet', p_enrollment_id;
  END IF;

  IF NOT public.is_learning_admin_for(v_enrollment.org_id) THEN
    RAISE EXCEPTION 'unauthorized: learning_issue_certification_for_enrollment';
  END IF;

  IF v_enrollment.status <> 'completed' OR v_enrollment.completed_at IS NULL THEN
    RAISE EXCEPTION 'course enrollment must be completed before certification can be issued';
  END IF;

  SELECT *
    INTO v_requirement
    FROM public.learning_access_requirements lar
   WHERE lar.required_course_id = v_enrollment.course_id
     AND lar.is_active = true
     AND (lar.org_id = v_enrollment.org_id OR lar.org_id IS NULL)
   ORDER BY (lar.org_id IS NULL) ASC
   LIMIT 1;

  IF v_requirement.id IS NULL THEN
    RAISE EXCEPTION 'no active access requirement found for course %', v_enrollment.course_id;
  END IF;

  IF v_requirement.validity_months IS NOT NULL THEN
    v_expires_at := v_issued_at + make_interval(months => v_requirement.validity_months);
  END IF;

  UPDATE public.learning_certifications lc
     SET status = 'superseded',
         superseded_by_id = NULL
   WHERE lc.user_id = v_enrollment.user_id
     AND lc.org_id = v_enrollment.org_id
     AND lc.certification_code = v_requirement.required_certification_code
     AND lc.status = 'active'
     AND (lc.expires_at IS NULL OR lc.expires_at <= now());

  SELECT lc.id
    INTO v_cert_id
    FROM public.learning_certifications lc
   WHERE lc.org_id = v_enrollment.org_id
     AND lc.user_id = v_enrollment.user_id
     AND lc.certification_code = v_requirement.required_certification_code
     AND lc.status = 'active'
   LIMIT 1;

  IF v_cert_id IS NULL THEN
    INSERT INTO public.learning_certifications (
      org_id,
      user_id,
      course_id,
      enrollment_id,
      certification_code,
      status,
      issued_at,
      expires_at
    )
    VALUES (
      v_enrollment.org_id,
      v_enrollment.user_id,
      v_enrollment.course_id,
      v_enrollment.id,
      v_requirement.required_certification_code,
      'active',
      v_issued_at,
      v_expires_at
    )
    RETURNING id INTO v_cert_id;
  ELSE
    UPDATE public.learning_certifications lc
       SET course_id = v_enrollment.course_id,
           enrollment_id = v_enrollment.id,
           issued_at = v_issued_at,
           expires_at = v_expires_at,
           updated_at = now()
     WHERE lc.id = v_cert_id;
  END IF;

  RETURN QUERY
  SELECT
    lc.id,
    lc.certification_code,
    lc.status,
    lc.issued_at,
    lc.expires_at
  FROM public.learning_certifications lc
  WHERE lc.id = v_cert_id;
END;
$$;


-- =============================================================================
-- 5. RPC: CHECK CAPABILITY ACCESS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.learning_check_capability_access(
  p_capability_code text DEFAULT 'routeai_usecase_check'
)
RETURNS TABLE (
  can_access boolean,
  capability_code text,
  required_certification_code text,
  certification_status text,
  required_course_id uuid,
  required_course_code text,
  certification_id uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_requirement public.learning_access_requirements%ROWTYPE;
  v_cert public.learning_certifications%ROWTYPE;
  v_course_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: learning_check_capability_access';
  END IF;

  v_org_id := public.get_user_org_id(v_user_id);

  IF v_org_id IS NULL THEN
    RETURN QUERY
    SELECT
      false,
      p_capability_code,
      NULL::text,
      'missing_profile_org'::text,
      NULL::uuid,
      NULL::text,
      NULL::uuid,
      NULL::timestamptz;
    RETURN;
  END IF;

  SELECT *
    INTO v_requirement
    FROM public.learning_access_requirements lar
   WHERE lar.capability_code = p_capability_code
     AND lar.is_active = true
     AND (lar.org_id = v_org_id OR lar.org_id IS NULL)
   ORDER BY (lar.org_id IS NULL) ASC
   LIMIT 1;

  IF v_requirement.id IS NULL THEN
    RETURN QUERY
    SELECT
      false,
      p_capability_code,
      NULL::text,
      'not_configured'::text,
      NULL::uuid,
      NULL::text,
      NULL::uuid,
      NULL::timestamptz;
    RETURN;
  END IF;

  SELECT lc.*
    INTO v_cert
    FROM public.learning_certifications lc
   WHERE lc.user_id = v_user_id
     AND lc.org_id = v_org_id
     AND lc.certification_code = v_requirement.required_certification_code
   ORDER BY
     CASE lc.status WHEN 'active' THEN 0 WHEN 'expired' THEN 1 ELSE 2 END,
     lc.issued_at DESC
   LIMIT 1;

  SELECT course_code
    INTO v_course_code
    FROM public.learning_courses
   WHERE id = v_requirement.required_course_id;

  IF v_cert.id IS NULL THEN
    RETURN QUERY
    SELECT
      false,
      p_capability_code,
      v_requirement.required_certification_code,
      'missing'::text,
      v_requirement.required_course_id,
      v_course_code,
      NULL::uuid,
      NULL::timestamptz;
    RETURN;
  END IF;

  IF v_cert.status = 'active' AND (v_cert.expires_at IS NULL OR v_cert.expires_at > now()) THEN
    RETURN QUERY
    SELECT
      true,
      p_capability_code,
      v_requirement.required_certification_code,
      'active'::text,
      v_requirement.required_course_id,
      v_course_code,
      v_cert.id,
      v_cert.expires_at;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    false,
    p_capability_code,
    v_requirement.required_certification_code,
    CASE
      WHEN v_cert.status = 'active' AND v_cert.expires_at <= now() THEN 'expired'
      ELSE v_cert.status
    END,
    v_requirement.required_course_id,
    v_course_code,
    v_cert.id,
    v_cert.expires_at;
END;
$$;


-- =============================================================================
-- 6. RLS
-- =============================================================================

ALTER TABLE public.learning_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_access_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_certifications_select_self_or_admin
  ON public.learning_certifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY learning_certifications_manage_learning_admin
  ON public.learning_certifications
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id));

CREATE POLICY learning_access_requirements_select
  ON public.learning_access_requirements
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR org_id IS NULL
    OR org_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY learning_access_requirements_manage_learning_admin
  ON public.learning_access_requirements
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id));

REVOKE ALL ON FUNCTION public.learning_issue_certification_for_enrollment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.learning_check_capability_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.learning_issue_certification_for_enrollment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.learning_check_capability_access(text) TO authenticated;
