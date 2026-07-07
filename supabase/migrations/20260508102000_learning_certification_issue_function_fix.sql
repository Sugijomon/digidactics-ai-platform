-- =============================================================================
-- RouteAI Learning System: certification issue function fix
-- =============================================================================
-- Purpose:
--   Avoid PL/pgSQL ambiguity between RETURNS TABLE column names and table
--   columns inside the certification issue flow.
-- =============================================================================

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
