-- =============================================================================
-- Evidence Foundation
-- =============================================================================
-- Purpose:
--   Add a platform-wide append-only evidence ledger and pin learning evidence to
--   the content versions that were actually used when attempts/certifications
--   were recorded.
--
-- Boundaries:
--   - No blockchain, knowledge graph, agents, Actor/Delegation refactor, or
--     AIUseCase lifecycle.
--   - Additive only. Existing SAI audit_events remain in place.
--   - Production must only receive this migration after a separate live go/no-go.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. PLATFORM EVENT LEDGER
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_event_ledger (
  event_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_type            text NOT NULL,
  event_schema_version  int NOT NULL DEFAULT 1,
  source_system         text NOT NULL DEFAULT 'platform',
  actor_id              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_kind            text NOT NULL DEFAULT 'system',
  classification        text NOT NULL DEFAULT 'internal',
  subject_table         text NOT NULL,
  subject_id            text NOT NULL,
  subject_version       text,
  decision_code         text,
  decision_rationale    text,
  content_version_hash  text,
  evidence_snapshot     jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id        uuid,
  causation_event_id    uuid REFERENCES public.platform_event_ledger(event_id) ON DELETE SET NULL,
  previous_event_hash   text,
  event_hash            text NOT NULL,
  hash_algorithm        text NOT NULL DEFAULT 'sha256',
  occurred_at           timestamptz NOT NULL DEFAULT now(),
  recorded_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_event_ledger_event_type_chk CHECK (length(trim(event_type)) > 0),
  CONSTRAINT platform_event_ledger_schema_version_chk CHECK (event_schema_version > 0),
  CONSTRAINT platform_event_ledger_actor_kind_chk CHECK (
    actor_kind IN ('system', 'service', 'user', 'admin', 'agent')
  ),
  CONSTRAINT platform_event_ledger_classification_chk CHECK (
    classification IN ('public', 'internal', 'confidential', 'restricted')
  ),
  CONSTRAINT platform_event_ledger_evidence_snapshot_chk CHECK (
    jsonb_typeof(evidence_snapshot) = 'object'
  ),
  CONSTRAINT platform_event_ledger_payload_chk CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT platform_event_ledger_hash_algorithm_chk CHECK (hash_algorithm = 'sha256')
);

CREATE INDEX IF NOT EXISTS platform_event_ledger_org_time_idx
  ON public.platform_event_ledger(org_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS platform_event_ledger_subject_idx
  ON public.platform_event_ledger(subject_table, subject_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS platform_event_ledger_actor_time_idx
  ON public.platform_event_ledger(actor_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS platform_event_ledger_type_time_idx
  ON public.platform_event_ledger(event_type, recorded_at DESC);

ALTER TABLE public.platform_event_ledger ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_event_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.platform_event_ledger TO authenticated;

DROP POLICY IF EXISTS platform_event_ledger_select_self_or_org_guardian
  ON public.platform_event_ledger;

CREATE POLICY platform_event_ledger_select_self_or_org_guardian
  ON public.platform_event_ledger
  FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_dpo_for(org_id))
  );

CREATE OR REPLACE FUNCTION public.set_platform_event_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_previous_hash text;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.subject_table || ':' || NEW.subject_id, 0)
  );

  SELECT pel.event_hash
    INTO v_previous_hash
    FROM public.platform_event_ledger pel
   WHERE pel.subject_table = NEW.subject_table
     AND pel.subject_id = NEW.subject_id
   ORDER BY pel.recorded_at DESC, pel.event_id DESC
   LIMIT 1;

  NEW.previous_event_hash := COALESCE(NEW.previous_event_hash, v_previous_hash);
  NEW.event_hash := encode(
    public.digest(
      concat_ws(
        '|',
        NEW.event_id::text,
        COALESCE(NEW.org_id::text, ''),
        NEW.event_type,
        NEW.event_schema_version::text,
        NEW.source_system,
        COALESCE(NEW.actor_id::text, ''),
        NEW.actor_kind,
        NEW.classification,
        NEW.subject_table,
        NEW.subject_id,
        COALESCE(NEW.subject_version, ''),
        COALESCE(NEW.decision_code, ''),
        COALESCE(NEW.decision_rationale, ''),
        COALESCE(NEW.content_version_hash, ''),
        NEW.evidence_snapshot::text,
        NEW.payload::text,
        COALESCE(NEW.correlation_id::text, ''),
        COALESCE(NEW.causation_event_id::text, ''),
        COALESCE(NEW.previous_event_hash, ''),
        NEW.occurred_at::text,
        NEW.recorded_at::text
      ),
      'sha256'
    ),
    'hex'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_platform_event_ledger_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'platform_event_ledger is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_event_ledger_hash
  ON public.platform_event_ledger;

CREATE TRIGGER trg_platform_event_ledger_hash
  BEFORE INSERT ON public.platform_event_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.set_platform_event_hash();

DROP TRIGGER IF EXISTS trg_platform_event_ledger_no_mutation
  ON public.platform_event_ledger;

CREATE TRIGGER trg_platform_event_ledger_no_mutation
  BEFORE UPDATE OR DELETE ON public.platform_event_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_platform_event_ledger_immutable();

CREATE OR REPLACE FUNCTION public.record_platform_event_internal(
  p_org_id uuid,
  p_event_type text,
  p_source_system text,
  p_actor_id uuid,
  p_actor_kind text,
  p_subject_table text,
  p_subject_id text,
  p_subject_version text DEFAULT NULL,
  p_decision_code text DEFAULT NULL,
  p_decision_rationale text DEFAULT NULL,
  p_content_version_hash text DEFAULT NULL,
  p_evidence_snapshot jsonb DEFAULT '{}'::jsonb,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_correlation_id uuid DEFAULT NULL,
  p_causation_event_id uuid DEFAULT NULL,
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.platform_event_ledger (
    org_id,
    event_type,
    source_system,
    actor_id,
    actor_kind,
    subject_table,
    subject_id,
    subject_version,
    decision_code,
    decision_rationale,
    content_version_hash,
    evidence_snapshot,
    payload,
    correlation_id,
    causation_event_id,
    occurred_at
  )
  VALUES (
    p_org_id,
    p_event_type,
    COALESCE(NULLIF(trim(p_source_system), ''), 'platform'),
    p_actor_id,
    COALESCE(NULLIF(trim(p_actor_kind), ''), 'system'),
    p_subject_table,
    p_subject_id,
    p_subject_version,
    p_decision_code,
    p_decision_rationale,
    p_content_version_hash,
    COALESCE(p_evidence_snapshot, '{}'::jsonb),
    COALESCE(p_payload, '{}'::jsonb),
    p_correlation_id,
    p_causation_event_id,
    COALESCE(p_occurred_at, now())
  )
  RETURNING event_id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_platform_event_hash() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_platform_event_ledger_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_platform_event_internal(
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  uuid,
  uuid,
  timestamptz
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_learning_content_sync_event(
  p_course_id uuid,
  p_content_version_hash text,
  p_evidence_snapshot jsonb DEFAULT '{}'::jsonb,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course public.learning_courses%ROWTYPE;
  v_actor_id uuid := auth.uid();
  v_jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_event_id uuid;
BEGIN
  SELECT *
    INTO v_course
    FROM public.learning_courses
   WHERE id = p_course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'learning course % not found for content sync evidence', p_course_id;
  END IF;

  IF v_jwt_role <> 'service_role'
     AND NOT public.is_learning_admin_for(v_course.org_id) THEN
    RAISE EXCEPTION 'unauthorized: record_learning_content_sync_event';
  END IF;

  v_event_id := public.record_platform_event_internal(
    v_course.org_id,
    'learning.content.synced',
    'rai-learning',
    v_actor_id,
    CASE WHEN v_jwt_role = 'service_role' THEN 'service' ELSE 'admin' END,
    'learning_courses',
    v_course.id::text,
    v_course.version::text,
    'synced',
    'Git-canonical learning content sync completed.',
    p_content_version_hash,
    COALESCE(p_evidence_snapshot, '{}'::jsonb),
    COALESCE(p_payload, '{}'::jsonb),
    NULL,
    NULL,
    now()
  );

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_learning_content_sync_event(uuid, text, jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_learning_content_sync_event(uuid, text, jsonb, jsonb)
  TO authenticated, service_role;

-- =============================================================================
-- 2. LEARNING ATTEMPT VERSION PINNING
-- =============================================================================

ALTER TABLE public.learning_page_attempts
  ADD COLUMN IF NOT EXISTS content_schema_version int,
  ADD COLUMN IF NOT EXISTS content_version int,
  ADD COLUMN IF NOT EXISTS content_version_hash text,
  ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS decision_rationale text;

ALTER TABLE public.learning_lesson_attempts
  ADD COLUMN IF NOT EXISTS content_schema_version int,
  ADD COLUMN IF NOT EXISTS content_version int,
  ADD COLUMN IF NOT EXISTS content_version_hash text,
  ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS decision_rationale text;

ALTER TABLE public.learning_page_attempts
  DROP CONSTRAINT IF EXISTS learning_page_attempts_evidence_snapshot_chk,
  ADD CONSTRAINT learning_page_attempts_evidence_snapshot_chk
    CHECK (jsonb_typeof(evidence_snapshot) = 'object');

ALTER TABLE public.learning_lesson_attempts
  DROP CONSTRAINT IF EXISTS learning_lesson_attempts_evidence_snapshot_chk,
  ADD CONSTRAINT learning_lesson_attempts_evidence_snapshot_chk
    CHECK (jsonb_typeof(evidence_snapshot) = 'object');

CREATE INDEX IF NOT EXISTS learning_page_attempts_content_hash_idx
  ON public.learning_page_attempts(content_version_hash);

CREATE OR REPLACE FUNCTION public.pin_learning_page_attempt_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_schema_version int;
  v_content_version int;
  v_content jsonb;
  v_content_hash text;
  v_page_code text;
  v_course_code text;
  v_answered_block_ids jsonb;
BEGIN
  SELECT
    lp.content_schema_version,
    lp.version,
    lp.content,
    lp.page_code,
    lc.course_code
  INTO
    v_content_schema_version,
    v_content_version,
    v_content,
    v_page_code,
    v_course_code
  FROM public.learning_pages lp
  JOIN public.learning_courses lc ON lc.id = lp.course_id
  WHERE lp.id = NEW.page_id
    AND lp.course_id = NEW.course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'learning page % is not part of course %', NEW.page_id, NEW.course_id;
  END IF;

  v_content_hash := encode(public.digest(v_content::text, 'sha256'), 'hex');

  SELECT COALESCE(jsonb_agg(answer_key ORDER BY answer_key), '[]'::jsonb)
    INTO v_answered_block_ids
    FROM jsonb_object_keys(COALESCE(NEW.answers, '{}'::jsonb)) AS answer_key;

  NEW.content_schema_version := v_content_schema_version;
  NEW.content_version := v_content_version;
  NEW.content_version_hash := v_content_hash;
  NEW.evidence_snapshot := jsonb_strip_nulls(
    COALESCE(NEW.evidence_snapshot, '{}'::jsonb)
    || jsonb_build_object(
      'content_source', 'learning_pages',
      'course_id', NEW.course_id,
      'course_code', v_course_code,
      'page_id', NEW.page_id,
      'page_code', v_page_code,
      'page_version', v_content_version,
      'content_schema_version', v_content_schema_version,
      'content_version_hash', v_content_hash,
      'attempt_number', NEW.attempt_number,
      'answered_block_ids', v_answered_block_ids,
      'manual_review_required', NEW.manual_review_required,
      'score', NEW.score,
      'max_score', NEW.max_score,
      'percentage', NEW.percentage,
      'passed', NEW.passed
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_learning_page_attempt_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_actor_id uuid;
  v_actor_kind text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'learning.page_attempt.submitted';
    v_actor_id := NEW.user_id;
    v_actor_kind := 'user';
  ELSIF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.max_score IS DISTINCT FROM OLD.max_score
     OR NEW.percentage IS DISTINCT FROM OLD.percentage
     OR NEW.passed IS DISTINCT FROM OLD.passed
     OR NEW.manual_review_required IS DISTINCT FROM OLD.manual_review_required
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.decision_rationale IS DISTINCT FROM OLD.decision_rationale
     OR NEW.graded_at IS DISTINCT FROM OLD.graded_at THEN
    v_event_type := 'learning.page_attempt.reviewed';
    v_actor_id := COALESCE(NEW.reviewer_id, auth.uid());
    v_actor_kind := CASE WHEN v_actor_id IS NULL THEN 'system' ELSE 'admin' END;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.record_platform_event_internal(
    NEW.org_id,
    v_event_type,
    'rai-learning',
    v_actor_id,
    v_actor_kind,
    'learning_page_attempts',
    NEW.id::text,
    NEW.attempt_number::text,
    CASE
      WHEN NEW.status = 'graded' AND NEW.passed IS TRUE THEN 'approved'
      WHEN NEW.status = 'graded' AND NEW.passed IS FALSE THEN 'rejected'
      ELSE NEW.status
    END,
    COALESCE(NEW.decision_rationale, NEW.reviewer_notes),
    NEW.content_version_hash,
    NEW.evidence_snapshot,
    jsonb_build_object(
      'course_id', NEW.course_id,
      'page_id', NEW.page_id,
      'status', NEW.status,
      'manual_review_required', NEW.manual_review_required,
      'passed', NEW.passed
    ),
    NULL,
    NULL,
    COALESCE(NEW.graded_at, NEW.submitted_at, now())
  );

  RETURN NEW;
END;
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
       OR NEW.decision_rationale IS NOT NULL
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
     OR NEW.decision_rationale IS DISTINCT FROM OLD.decision_rationale
     OR NEW.graded_at IS DISTINCT FROM OLD.graded_at THEN
    RAISE EXCEPTION 'Learners cannot update learning page grading fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS learning_page_attempts_insert_self
  ON public.learning_page_attempts;

CREATE POLICY learning_page_attempts_insert_self ON public.learning_page_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND org_id = public.get_user_org_id(auth.uid())
    AND score IS NULL
    AND max_score IS NULL
    AND percentage IS NULL
    AND passed IS NULL
    AND reviewer_id IS NULL
    AND reviewer_notes IS NULL
    AND decision_rationale IS NULL
    AND graded_at IS NULL
    AND status <> 'graded'
  );

DROP TRIGGER IF EXISTS trg_learning_page_attempts_evidence_pin
  ON public.learning_page_attempts;

CREATE TRIGGER trg_learning_page_attempts_evidence_pin
  BEFORE INSERT ON public.learning_page_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.pin_learning_page_attempt_evidence();

DROP TRIGGER IF EXISTS trg_learning_page_attempts_event
  ON public.learning_page_attempts;

CREATE TRIGGER trg_learning_page_attempts_event
  AFTER INSERT OR UPDATE ON public.learning_page_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.record_learning_page_attempt_event();

REVOKE ALL ON FUNCTION public.pin_learning_page_attempt_evidence() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_learning_page_attempt_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_learning_page_attempt_grading() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS learning_lesson_attempts_content_hash_idx
  ON public.learning_lesson_attempts(content_version_hash);

CREATE OR REPLACE FUNCTION public.pin_learning_lesson_attempt_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_schema_version int;
  v_content_version int;
  v_content jsonb;
  v_content_hash text;
  v_lesson_code text;
  v_course_code text;
  v_answered_block_ids jsonb;
BEGIN
  SELECT
    ll.content_schema_version,
    ll.version,
    ll.content,
    ll.lesson_code
  INTO
    v_content_schema_version,
    v_content_version,
    v_content,
    v_lesson_code
  FROM public.learning_lessons ll
  WHERE ll.id = NEW.lesson_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'learning lesson % not found', NEW.lesson_id;
  END IF;

  IF NEW.course_id IS NOT NULL THEN
    SELECT lc.course_code
      INTO v_course_code
      FROM public.learning_courses lc
     WHERE lc.id = NEW.course_id;
  END IF;

  v_content_hash := encode(public.digest(v_content::text, 'sha256'), 'hex');

  SELECT COALESCE(jsonb_agg(answer_key ORDER BY answer_key), '[]'::jsonb)
    INTO v_answered_block_ids
    FROM jsonb_object_keys(COALESCE(NEW.answers, '{}'::jsonb)) AS answer_key;

  NEW.content_schema_version := v_content_schema_version;
  NEW.content_version := v_content_version;
  NEW.content_version_hash := v_content_hash;
  NEW.evidence_snapshot := jsonb_strip_nulls(
    COALESCE(NEW.evidence_snapshot, '{}'::jsonb)
    || jsonb_build_object(
      'content_source', 'learning_lessons',
      'course_id', NEW.course_id,
      'course_code', v_course_code,
      'lesson_id', NEW.lesson_id,
      'lesson_code', v_lesson_code,
      'lesson_version', v_content_version,
      'content_schema_version', v_content_schema_version,
      'content_version_hash', v_content_hash,
      'attempt_number', NEW.attempt_number,
      'answered_block_ids', v_answered_block_ids,
      'manual_review_required', NEW.manual_review_required,
      'score', NEW.score,
      'max_score', NEW.max_score,
      'percentage', NEW.percentage,
      'passed', NEW.passed
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_learning_lesson_attempt_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_actor_id uuid;
  v_actor_kind text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'learning.lesson_attempt.submitted';
    v_actor_id := NEW.user_id;
    v_actor_kind := 'user';
  ELSIF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.max_score IS DISTINCT FROM OLD.max_score
     OR NEW.percentage IS DISTINCT FROM OLD.percentage
     OR NEW.passed IS DISTINCT FROM OLD.passed
     OR NEW.manual_review_required IS DISTINCT FROM OLD.manual_review_required
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.decision_rationale IS DISTINCT FROM OLD.decision_rationale
     OR NEW.graded_at IS DISTINCT FROM OLD.graded_at THEN
    v_event_type := 'learning.lesson_attempt.reviewed';
    v_actor_id := COALESCE(NEW.reviewer_id, auth.uid());
    v_actor_kind := CASE WHEN v_actor_id IS NULL THEN 'system' ELSE 'admin' END;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.record_platform_event_internal(
    NEW.org_id,
    v_event_type,
    'rai-learning',
    v_actor_id,
    v_actor_kind,
    'learning_lesson_attempts',
    NEW.id::text,
    NEW.attempt_number::text,
    CASE
      WHEN NEW.status = 'graded' AND NEW.passed IS TRUE THEN 'approved'
      WHEN NEW.status = 'graded' AND NEW.passed IS FALSE THEN 'rejected'
      ELSE NEW.status
    END,
    COALESCE(NEW.decision_rationale, NEW.reviewer_notes),
    NEW.content_version_hash,
    NEW.evidence_snapshot,
    jsonb_build_object(
      'course_id', NEW.course_id,
      'lesson_id', NEW.lesson_id,
      'status', NEW.status,
      'manual_review_required', NEW.manual_review_required,
      'passed', NEW.passed
    ),
    NULL,
    NULL,
    COALESCE(NEW.graded_at, NEW.submitted_at, now())
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_learning_attempt_grading()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_learning_admin_for(NEW.org_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.score IS NOT NULL
      OR NEW.max_score IS NOT NULL
      OR NEW.percentage IS NOT NULL
      OR NEW.passed IS NOT NULL
      OR NEW.reviewer_id IS NOT NULL
      OR NEW.reviewer_notes IS NOT NULL
      OR NEW.decision_rationale IS NOT NULL
      OR NEW.graded_at IS NOT NULL
      OR NEW.status = 'graded'
    THEN
      RAISE EXCEPTION 'learners cannot grade their own learning attempts';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.score IS DISTINCT FROM OLD.score
      OR NEW.max_score IS DISTINCT FROM OLD.max_score
      OR NEW.percentage IS DISTINCT FROM OLD.percentage
      OR NEW.passed IS DISTINCT FROM OLD.passed
      OR NEW.manual_review_required IS DISTINCT FROM OLD.manual_review_required
      OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
      OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
      OR NEW.decision_rationale IS DISTINCT FROM OLD.decision_rationale
      OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
      OR (OLD.status <> 'graded' AND NEW.status = 'graded')
    THEN
      RAISE EXCEPTION 'only learning admins can update grading fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS lla_insert_self
  ON public.learning_lesson_attempts;

CREATE POLICY lla_insert_self ON public.learning_lesson_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND org_id = public.get_user_org_id(auth.uid())
    AND score IS NULL
    AND max_score IS NULL
    AND percentage IS NULL
    AND passed IS NULL
    AND reviewer_id IS NULL
    AND reviewer_notes IS NULL
    AND decision_rationale IS NULL
    AND graded_at IS NULL
    AND status <> 'graded'
  );

DROP TRIGGER IF EXISTS trg_learning_lesson_attempts_evidence_pin
  ON public.learning_lesson_attempts;

CREATE TRIGGER trg_learning_lesson_attempts_evidence_pin
  BEFORE INSERT ON public.learning_lesson_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.pin_learning_lesson_attempt_evidence();

DROP TRIGGER IF EXISTS trg_learning_lesson_attempts_event
  ON public.learning_lesson_attempts;

CREATE TRIGGER trg_learning_lesson_attempts_event
  AFTER INSERT OR UPDATE ON public.learning_lesson_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.record_learning_lesson_attempt_event();

REVOKE ALL ON FUNCTION public.pin_learning_lesson_attempt_evidence() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_learning_lesson_attempt_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_learning_attempt_grading() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 3. CERTIFICATION VERSION PINNING
-- =============================================================================

ALTER TABLE public.learning_certifications
  ADD COLUMN IF NOT EXISTS course_version int,
  ADD COLUMN IF NOT EXISTS course_version_hash text,
  ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS decision_rationale text,
  ADD COLUMN IF NOT EXISTS issued_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.learning_certifications
  DROP CONSTRAINT IF EXISTS learning_certifications_evidence_snapshot_chk,
  ADD CONSTRAINT learning_certifications_evidence_snapshot_chk
    CHECK (jsonb_typeof(evidence_snapshot) = 'object');

CREATE INDEX IF NOT EXISTS learning_certifications_course_hash_idx
  ON public.learning_certifications(course_version_hash);

CREATE OR REPLACE FUNCTION public.pin_learning_certification_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course public.learning_courses%ROWTYPE;
  v_required_page_hashes jsonb := '[]'::jsonb;
  v_latest_attempts jsonb := '[]'::jsonb;
  v_course_hash text;
BEGIN
  SELECT *
    INTO v_course
    FROM public.learning_courses
   WHERE id = NEW.course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'learning course % not found for certification evidence', NEW.course_id;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'page_id', lp.id,
        'page_code', lp.page_code,
        'page_version', lp.version,
        'content_schema_version', lp.content_schema_version,
        'content_version_hash', encode(public.digest(lp.content::text, 'sha256'), 'hex')
      )
      ORDER BY lp.sequence_order, lp.page_code
    ),
    '[]'::jsonb
  )
  INTO v_required_page_hashes
  FROM public.learning_pages lp
  WHERE lp.course_id = NEW.course_id
    AND lp.is_required = true
    AND lp.status = 'published';

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'attempt_id', latest_attempt.id,
        'page_id', latest_attempt.page_id,
        'attempt_number', latest_attempt.attempt_number,
        'status', latest_attempt.status,
        'passed', latest_attempt.passed,
        'manual_review_required', latest_attempt.manual_review_required,
        'content_version_hash', latest_attempt.content_version_hash,
        'submitted_at', latest_attempt.submitted_at,
        'graded_at', latest_attempt.graded_at
      )
      ORDER BY latest_attempt.page_id
    ),
    '[]'::jsonb
  )
  INTO v_latest_attempts
  FROM (
    SELECT DISTINCT ON (lpa.page_id)
      lpa.id,
      lpa.page_id,
      lpa.attempt_number,
      lpa.status,
      lpa.passed,
      lpa.manual_review_required,
      lpa.content_version_hash,
      lpa.submitted_at,
      lpa.graded_at
    FROM public.learning_page_attempts lpa
    WHERE lpa.course_id = NEW.course_id
      AND lpa.user_id = NEW.user_id
    ORDER BY lpa.page_id, lpa.attempt_number DESC
  ) AS latest_attempt;

  v_course_hash := encode(
    public.digest(
      jsonb_build_object(
        'course_id', v_course.id,
        'course_code', v_course.course_code,
        'course_version', v_course.version,
        'passing_threshold', v_course.passing_threshold,
        'required_pages', v_required_page_hashes
      )::text,
      'sha256'
    ),
    'hex'
  );

  NEW.course_version := v_course.version;
  NEW.course_version_hash := v_course_hash;
  NEW.issued_by := COALESCE(NEW.issued_by, auth.uid());
  NEW.decision_rationale := COALESCE(
    NEW.decision_rationale,
    'Certification issued after database eligibility checks passed.'
  );
  NEW.evidence_snapshot := jsonb_strip_nulls(
    COALESCE(NEW.evidence_snapshot, '{}'::jsonb)
    || jsonb_build_object(
      'content_source', 'learning_courses',
      'course_id', NEW.course_id,
      'course_code', v_course.course_code,
      'course_version', v_course.version,
      'course_version_hash', v_course_hash,
      'certification_code', NEW.certification_code,
      'required_pages', v_required_page_hashes,
      'latest_attempts', v_latest_attempts
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_learning_certification_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'learning.certification.issued';
  ELSIF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
     OR NEW.revoked_by IS DISTINCT FROM OLD.revoked_by
     OR NEW.revoke_reason IS DISTINCT FROM OLD.revoke_reason
     OR NEW.decision_rationale IS DISTINCT FROM OLD.decision_rationale THEN
    v_event_type := 'learning.certification.updated';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.record_platform_event_internal(
    NEW.org_id,
    v_event_type,
    'rai-learning',
    COALESCE(NEW.issued_by, NEW.revoked_by, auth.uid(), NEW.user_id),
    CASE WHEN COALESCE(NEW.issued_by, NEW.revoked_by, auth.uid()) IS NULL THEN 'system' ELSE 'admin' END,
    'learning_certifications',
    NEW.id::text,
    NEW.certification_code,
    CASE WHEN TG_OP = 'INSERT' THEN 'auto_eligibility' ELSE NEW.status END,
    COALESCE(NEW.decision_rationale, NEW.revoke_reason),
    NEW.course_version_hash,
    NEW.evidence_snapshot,
    jsonb_build_object(
      'course_id', NEW.course_id,
      'enrollment_id', NEW.enrollment_id,
      'certification_code', NEW.certification_code,
      'status', NEW.status,
      'expires_at', NEW.expires_at
    ),
    NULL,
    NULL,
    COALESCE(NEW.revoked_at, NEW.issued_at, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_learning_certifications_evidence_pin
  ON public.learning_certifications;

CREATE TRIGGER trg_learning_certifications_evidence_pin
  BEFORE INSERT ON public.learning_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.pin_learning_certification_evidence();

DROP TRIGGER IF EXISTS trg_learning_certifications_event
  ON public.learning_certifications;

CREATE TRIGGER trg_learning_certifications_event
  AFTER INSERT OR UPDATE ON public.learning_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.record_learning_certification_event();

REVOKE ALL ON FUNCTION public.pin_learning_certification_evidence() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_learning_certification_event() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 4. DPO DECISION RATIONALE CAPTURE
-- =============================================================================

ALTER TABLE public.dpo_review_items
  ADD COLUMN IF NOT EXISTS decision_rationale text;

UPDATE public.dpo_review_items
   SET decision_rationale = decision_notes
 WHERE decision_rationale IS NULL
   AND decision_notes IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_dpo_review_decision_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.decision_code IS NOT DISTINCT FROM OLD.decision_code
     AND NEW.decision_notes IS NOT DISTINCT FROM OLD.decision_notes
     AND NEW.decision_rationale IS NOT DISTINCT FROM OLD.decision_rationale
     AND NEW.resolved_by IS NOT DISTINCT FROM OLD.resolved_by
     AND NEW.resolved_at IS NOT DISTINCT FROM OLD.resolved_at THEN
    RETURN NEW;
  END IF;

  PERFORM public.record_platform_event_internal(
    NEW.org_id,
    'dpo.review.decision_recorded',
    'sai',
    COALESCE(NEW.resolved_by, NEW.assigned_to, auth.uid()),
    CASE WHEN COALESCE(NEW.resolved_by, NEW.assigned_to, auth.uid()) IS NULL THEN 'system' ELSE 'admin' END,
    'dpo_review_items',
    NEW.id::text,
    NEW.status,
    NEW.decision_code,
    COALESCE(NEW.decision_rationale, NEW.decision_notes),
    NULL,
    jsonb_build_object(
      'survey_run_id', NEW.survey_run_id,
      'survey_tool_id', NEW.survey_tool_id,
      'scoring_config_id', NEW.scoring_config_id,
      'policy_snapshot_id', NEW.policy_snapshot_id,
      'reason_code', NEW.reason_code,
      'review_class', NEW.review_class,
      'trigger_codes', NEW.trigger_codes
    ),
    jsonb_build_object(
      'status', NEW.status,
      'decision_code', NEW.decision_code,
      'priority_score', NEW.priority_score,
      'resolved_at', NEW.resolved_at
    ),
    NULL,
    NULL,
    COALESCE(NEW.resolved_at, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dpo_review_items_decision_event
  ON public.dpo_review_items;

CREATE TRIGGER trg_dpo_review_items_decision_event
  AFTER UPDATE ON public.dpo_review_items
  FOR EACH ROW
  EXECUTE FUNCTION public.record_dpo_review_decision_event();

REVOKE ALL ON FUNCTION public.record_dpo_review_decision_event() FROM PUBLIC, anon, authenticated;

COMMIT;
