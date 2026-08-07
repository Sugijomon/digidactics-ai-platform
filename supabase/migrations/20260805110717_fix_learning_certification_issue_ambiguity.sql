-- Qualify every table column that can collide with a RETURNS TABLE output
-- variable (notably certification_code, status, issued_at and expires_at).
CREATE OR REPLACE FUNCTION public.learning_issue_certification_for_enrollment(
  p_enrollment_id uuid
)
RETURNS TABLE (
  certification_id uuid,
  certification_code text,
  status text,
  issued_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment public.learning_course_enrollments%ROWTYPE;
  v_requirement public.learning_access_requirements%ROWTYPE;
  v_cert public.learning_certifications%ROWTYPE;
  v_course public.learning_courses%ROWTYPE;
  v_page record;
  v_attempt record;
  v_block jsonb;
  v_block_id text;
  v_required_page_count int := 0;
  v_required_block_count int := 0;
  v_issued_at timestamptz := now();
  v_expires_at timestamptz;
BEGIN
  SELECT enrollment.*
  INTO v_enrollment
  FROM public.learning_course_enrollments AS enrollment
  WHERE enrollment.id = p_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Learning enrollment % not found', p_enrollment_id;
  END IF;

  IF auth.uid() IS DISTINCT FROM v_enrollment.user_id
     AND NOT public.is_learning_admin_for(v_enrollment.org_id) THEN
    RAISE EXCEPTION 'Not allowed to issue this learning certification';
  END IF;

  SELECT course.*
  INTO v_course
  FROM public.learning_courses AS course
  WHERE course.id = v_enrollment.course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Learning course % not found', v_enrollment.course_id;
  END IF;

  SELECT requirement.*
  INTO v_requirement
  FROM public.learning_access_requirements AS requirement
  WHERE requirement.required_course_id = v_enrollment.course_id
    AND requirement.is_active = true
    AND (requirement.org_id = v_enrollment.org_id OR requirement.org_id IS NULL)
  ORDER BY (requirement.org_id IS NULL), requirement.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active access requirement found for course %', v_enrollment.course_id;
  END IF;

  FOR v_page IN
    SELECT page.id, page.content
    FROM public.learning_pages AS page
    WHERE page.course_id = v_enrollment.course_id
      AND page.is_required = true
      AND page.status = 'published'
  LOOP
    v_required_page_count := v_required_page_count + 1;

    IF NOT EXISTS (
      SELECT 1
      FROM public.learning_page_progress AS progress
      WHERE progress.user_id = v_enrollment.user_id
        AND progress.course_id = v_enrollment.course_id
        AND progress.page_id = v_page.id
        AND progress.status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Required learning page % is not completed', v_page.id;
    END IF;

    SELECT
      attempt.answers,
      attempt.manual_review_required,
      attempt.passed,
      attempt.percentage,
      attempt.attempt_number
    INTO v_attempt
    FROM public.learning_page_attempts AS attempt
    WHERE attempt.user_id = v_enrollment.user_id
      AND attempt.course_id = v_enrollment.course_id
      AND attempt.page_id = v_page.id
    ORDER BY attempt.attempt_number DESC
    LIMIT 1;

    FOR v_block IN
      SELECT block
      FROM jsonb_array_elements(COALESCE(v_page.content->'blocks', '[]'::jsonb)) AS blocks(block)
      WHERE COALESCE((block->>'required_for_certificate')::boolean, false)
    LOOP
      v_required_block_count := v_required_block_count + 1;
      v_block_id := v_block->>'id';

      IF v_attempt IS NULL THEN
        RAISE EXCEPTION 'Required learning evidence % has no attempt', v_block_id;
      END IF;

      IF COALESCE(v_attempt.manual_review_required, false) THEN
        RAISE EXCEPTION 'Required learning evidence % is still awaiting manual review', v_block_id;
      END IF;

      IF v_block->>'type' IN ('quiz_essay', 'short_answer', 'reflection', 'case_lab') THEN
        IF v_attempt.passed IS DISTINCT FROM true THEN
          RAISE EXCEPTION 'Required manual learning evidence % is not approved', v_block_id;
        END IF;
      ELSIF NOT public.learning_block_answer_is_correct(v_block, v_attempt.answers->v_block_id) THEN
        RAISE EXCEPTION 'Required learning evidence % is not correct', v_block_id;
      END IF;
    END LOOP;
  END LOOP;

  IF v_required_page_count = 0 THEN
    RAISE EXCEPTION 'Course % has no required published pages', v_enrollment.course_id;
  END IF;

  IF v_required_block_count = 0 THEN
    RAISE EXCEPTION 'Course % has no certificate evidence blocks', v_enrollment.course_id;
  END IF;

  UPDATE public.learning_course_enrollments AS enrollment
  SET
    status = 'completed',
    completed_at = COALESCE(enrollment.completed_at, v_issued_at),
    progress_percentage = 100,
    updated_at = v_issued_at
  WHERE enrollment.id = v_enrollment.id;

  IF v_requirement.validity_months IS NOT NULL THEN
    v_expires_at := v_issued_at + make_interval(months => v_requirement.validity_months);
  END IF;

  SELECT certification.*
  INTO v_cert
  FROM public.learning_certifications AS certification
  WHERE certification.org_id = v_enrollment.org_id
    AND certification.user_id = v_enrollment.user_id
    AND certification.certification_code = v_requirement.required_certification_code
    AND certification.status = 'active'
  ORDER BY certification.issued_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.learning_certifications AS certification
    SET
      course_id = v_enrollment.course_id,
      enrollment_id = v_enrollment.id,
      issued_at = v_issued_at,
      expires_at = v_expires_at,
      updated_at = v_issued_at
    WHERE certification.id = v_cert.id
    RETURNING certification.* INTO v_cert;
  ELSE
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
    RETURNING * INTO v_cert;
  END IF;

  RETURN QUERY
  SELECT
    v_cert.id,
    v_cert.certification_code,
    v_cert.status,
    v_cert.issued_at,
    v_cert.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.learning_issue_certification_for_enrollment(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_issue_certification_for_enrollment(uuid)
  TO authenticated, service_role;
