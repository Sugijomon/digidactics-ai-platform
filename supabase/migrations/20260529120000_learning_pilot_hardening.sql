-- RAI Learning pilot hardening
-- - Bootstraps core platform courses/access gate for fresh databases.
-- - Protects grading/completion columns from learner-side REST manipulation.
-- - Recomputes certification eligibility inside the database before issuing.

INSERT INTO public.learning_courses (
  course_code,
  title,
  subtitle,
  description,
  status,
  difficulty_level,
  audience_roles,
  regulatory_frameworks,
  required_for_onboarding,
  unlocks_capability,
  passing_threshold,
  published_at
)
VALUES
  (
    'ai-literacy-foundation',
    'AI Literacy Foundation',
    'AI-rijbewijs voor verantwoord AI-gebruik',
    'Basiscursus voor medewerkers die AI veilig, verantwoord en aantoonbaar willen gebruiken.',
    'published',
    'foundation',
    ARRAY['medewerker', 'mkb', 'management'],
    ARRAY['EU AI Act Article 4', 'EU AI Act Article 5', 'GDPR'],
    true,
    'routeai_usecase_check',
    80,
    now()
  ),
  (
    'ai-proficiency',
    'AI Proficiency',
    'Praktisch en rolspecifiek werken met AI',
    'Vervolgmodule voor professionals die AI structureel in workflows gebruiken en output moeten verifiëren.',
    'published',
    'intermediate',
    ARRAY['professional', 'teamlead', 'ai-ambassador'],
    ARRAY['EU AI Act Article 4', 'EU AI Act Article 26', 'EU AI Act Article 50', 'GDPR'],
    false,
    null,
    80,
    now()
  ),
  (
    'ai-mastery',
    'AI Mastery',
    'Governance, risico en compliant AI-ontwerp',
    'Verdiepende module voor AI-eigenaren, compliance, IT en ontwikkelaars rond governance en hoog-risico AI.',
    'published',
    'advanced',
    ARRAY['ai-owner', 'compliance', 'it', 'developer'],
    ARRAY['EU AI Act Articles 9-15', 'EU AI Act Article 27', 'EU AI Act GPAI', 'ISO 42001'],
    false,
    null,
    80,
    now()
  )
ON CONFLICT (course_code) WHERE org_id IS NULL
DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  difficulty_level = EXCLUDED.difficulty_level,
  audience_roles = EXCLUDED.audience_roles,
  regulatory_frameworks = EXCLUDED.regulatory_frameworks,
  required_for_onboarding = EXCLUDED.required_for_onboarding,
  unlocks_capability = EXCLUDED.unlocks_capability,
  passing_threshold = EXCLUDED.passing_threshold,
  published_at = COALESCE(public.learning_courses.published_at, EXCLUDED.published_at),
  updated_at = now();

INSERT INTO public.learning_access_requirements (
  org_id,
  capability_code,
  required_certification_code,
  required_course_id,
  title,
  description,
  validity_months,
  is_active
)
SELECT
  null,
  'routeai_usecase_check',
  'ai_literacy_foundation',
  c.id,
  'RouteAI use-case check vereist AI Literacy',
  'Platformbrede capability gate: gebruikers hebben een actief AI Literacy rijbewijs nodig voordat zij RouteAI use-case checks mogen uitvoeren.',
  12,
  true
FROM public.learning_courses c
WHERE c.org_id IS NULL
  AND c.course_code = 'ai-literacy-foundation'
ON CONFLICT (capability_code) WHERE org_id IS NULL AND is_active = true
DO UPDATE SET
  required_certification_code = EXCLUDED.required_certification_code,
  required_course_id = EXCLUDED.required_course_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  validity_months = EXCLUDED.validity_months,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.learning_is_trusted_writer(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT current_user IN ('postgres', 'service_role', 'supabase_admin')
      OR public.is_learning_admin_for(p_org_id);
$$;

CREATE OR REPLACE FUNCTION public.protect_learning_page_attempt_grading()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := COALESCE(NEW.org_id, OLD.org_id);
BEGIN
  IF public.learning_is_trusted_writer(v_org_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'graded'
       OR NEW.score IS NOT NULL
       OR NEW.max_score IS NOT NULL
       OR NEW.percentage IS NOT NULL
       OR NEW.passed IS NOT NULL
       OR COALESCE(NEW.manual_review_required, false) IS TRUE
       OR NEW.reviewer_id IS NOT NULL
       OR NEW.reviewer_notes IS NOT NULL
       OR NEW.graded_at IS NOT NULL THEN
      RAISE EXCEPTION 'Learners cannot write learning page grading fields';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.max_score IS DISTINCT FROM OLD.max_score
     OR NEW.percentage IS DISTINCT FROM OLD.percentage
     OR NEW.passed IS DISTINCT FROM OLD.passed
     OR NEW.manual_review_required IS DISTINCT FROM OLD.manual_review_required
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.graded_at IS DISTINCT FROM OLD.graded_at THEN
    RAISE EXCEPTION 'Learners cannot update learning page grading fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_learning_page_attempt_grading
  ON public.learning_page_attempts;

CREATE TRIGGER trg_protect_learning_page_attempt_grading
  BEFORE INSERT OR UPDATE ON public.learning_page_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_learning_page_attempt_grading();

CREATE OR REPLACE FUNCTION public.protect_learning_course_enrollment_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := COALESCE(NEW.org_id, OLD.org_id);
BEGIN
  IF public.learning_is_trusted_writer(v_org_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed'
       OR NEW.completed_at IS NOT NULL
       OR NEW.final_score IS NOT NULL THEN
      RAISE EXCEPTION 'Learners cannot write learning course completion fields';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
     OR NEW.final_score IS DISTINCT FROM OLD.final_score THEN
    RAISE EXCEPTION 'Learners cannot update learning course completion fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_learning_course_enrollment_completion
  ON public.learning_course_enrollments;

CREATE TRIGGER trg_protect_learning_course_enrollment_completion
  BEFORE INSERT OR UPDATE ON public.learning_course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_learning_course_enrollment_completion();

CREATE OR REPLACE FUNCTION public.learning_jsonb_text_array(p_value jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(item ORDER BY item), ARRAY[]::text[])
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(p_value) = 'array' THEN p_value ELSE '[]'::jsonb END
  ) AS items(item);
$$;

CREATE OR REPLACE FUNCTION public.learning_block_answer_is_correct(
  p_block jsonb,
  p_answer jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_type text := p_block->>'type';
  v_answer_value jsonb := p_answer->'value';
  v_selected_text text := p_answer->>'value';
  v_recommended_choice_id text;
BEGIN
  IF p_answer IS NULL OR jsonb_typeof(p_answer) <> 'object' THEN
    RETURN false;
  END IF;

  CASE v_type
    WHEN 'scenario' THEN
      SELECT choice->>'id'
      INTO v_recommended_choice_id
      FROM jsonb_array_elements(COALESCE(p_block->'choices', '[]'::jsonb)) AS choices(choice)
      WHERE COALESCE((choice->>'is_recommended')::boolean, false)
      LIMIT 1;

      RETURN v_recommended_choice_id IS NOT NULL
         AND v_selected_text = v_recommended_choice_id;

    WHEN 'quiz_multiple_choice' THEN
      RETURN v_selected_text IS NOT NULL
         AND v_selected_text = p_block->>'correct_option_id';

    WHEN 'quiz_multiple_select' THEN
      RETURN public.learning_jsonb_text_array(v_answer_value)
           = public.learning_jsonb_text_array(COALESCE(p_block->'correct_option_ids', '[]'::jsonb));

    WHEN 'quiz_true_false' THEN
      IF v_selected_text NOT IN ('true', 'false') THEN
        RETURN false;
      END IF;

      RETURN v_selected_text::boolean = (p_block->>'correct_answer')::boolean;

    ELSE
      RETURN p_answer ? 'value';
  END CASE;
END;
$$;

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
  SELECT *
  INTO v_enrollment
  FROM public.learning_course_enrollments
  WHERE id = p_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Learning enrollment % not found', p_enrollment_id;
  END IF;

  IF auth.uid() IS DISTINCT FROM v_enrollment.user_id
     AND NOT public.is_learning_admin_for(v_enrollment.org_id) THEN
    RAISE EXCEPTION 'Not allowed to issue this learning certification';
  END IF;

  SELECT *
  INTO v_course
  FROM public.learning_courses
  WHERE id = v_enrollment.course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Learning course % not found', v_enrollment.course_id;
  END IF;

  SELECT *
  INTO v_requirement
  FROM public.learning_access_requirements
  WHERE required_course_id = v_enrollment.course_id
    AND is_active = true
    AND (org_id = v_enrollment.org_id OR org_id IS NULL)
  ORDER BY (org_id IS NULL), updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active access requirement found for course %', v_enrollment.course_id;
  END IF;

  FOR v_page IN
    SELECT id, content
    FROM public.learning_pages
    WHERE course_id = v_enrollment.course_id
      AND is_required = true
      AND status = 'published'
  LOOP
    v_required_page_count := v_required_page_count + 1;

    IF NOT EXISTS (
      SELECT 1
      FROM public.learning_page_progress lpp
      WHERE lpp.user_id = v_enrollment.user_id
        AND lpp.course_id = v_enrollment.course_id
        AND lpp.page_id = v_page.id
        AND lpp.status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Required learning page % is not completed', v_page.id;
    END IF;

    SELECT lpa.answers, lpa.manual_review_required, lpa.passed, lpa.percentage, lpa.attempt_number
    INTO v_attempt
    FROM public.learning_page_attempts lpa
    WHERE lpa.user_id = v_enrollment.user_id
      AND lpa.course_id = v_enrollment.course_id
      AND lpa.page_id = v_page.id
    ORDER BY lpa.attempt_number DESC
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

  UPDATE public.learning_course_enrollments
  SET
    status = 'completed',
    completed_at = COALESCE(completed_at, v_issued_at),
    progress_percentage = 100,
    updated_at = v_issued_at
  WHERE id = v_enrollment.id;

  IF v_requirement.validity_months IS NOT NULL THEN
    v_expires_at := v_issued_at + make_interval(months => v_requirement.validity_months);
  END IF;

  SELECT *
  INTO v_cert
  FROM public.learning_certifications
  WHERE org_id = v_enrollment.org_id
    AND user_id = v_enrollment.user_id
    AND certification_code = v_requirement.required_certification_code
    AND status = 'active'
  ORDER BY issued_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.learning_certifications
    SET
      course_id = v_enrollment.course_id,
      enrollment_id = v_enrollment.id,
      issued_at = v_issued_at,
      expires_at = v_expires_at,
      updated_at = v_issued_at
    WHERE id = v_cert.id
    RETURNING * INTO v_cert;
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

REVOKE ALL ON FUNCTION public.learning_is_trusted_writer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.learning_is_trusted_writer(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.learning_jsonb_text_array(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.learning_jsonb_text_array(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.learning_block_answer_is_correct(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.learning_block_answer_is_correct(jsonb, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.learning_issue_certification_for_enrollment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.learning_issue_certification_for_enrollment(uuid) TO authenticated, service_role;
