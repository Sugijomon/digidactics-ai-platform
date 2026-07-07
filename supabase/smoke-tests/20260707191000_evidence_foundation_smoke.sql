-- Evidence Foundation smoke test.
-- Run only after the Evidence Foundation migration has been applied to local or
-- staging. This test is metadata-only and does not mutate application data.

DO $$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(required_object)
    INTO v_missing
    FROM (
      VALUES
        ('table', 'public.platform_event_ledger'::text),
        ('function', 'public.set_platform_event_hash()'),
        ('function', 'public.record_platform_event_internal(uuid,text,text,uuid,text,text,text,text,text,text,text,jsonb,jsonb,uuid,uuid,timestamp with time zone)'),
        ('function', 'public.pin_learning_page_attempt_evidence()'),
        ('function', 'public.pin_learning_lesson_attempt_evidence()'),
        ('function', 'public.pin_learning_certification_evidence()'),
        ('function', 'public.record_dpo_review_decision_event()')
    ) AS expected(object_kind, required_object)
   WHERE CASE expected.object_kind
     WHEN 'table' THEN to_regclass(required_object) IS NULL
     WHEN 'function' THEN to_regprocedure(required_object) IS NULL
     ELSE true
   END;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Evidence Foundation objects: %', v_missing;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'platform_event_ledger'
       AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'platform_event_ledger must have RLS enabled';
  END IF;
END;
$$;

DO $$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(table_name || '.' || column_name)
    INTO v_missing
    FROM (
      VALUES
        ('learning_page_attempts', 'content_version_hash'),
        ('learning_page_attempts', 'evidence_snapshot'),
        ('learning_page_attempts', 'decision_rationale'),
        ('learning_lesson_attempts', 'content_version_hash'),
        ('learning_lesson_attempts', 'evidence_snapshot'),
        ('learning_lesson_attempts', 'decision_rationale'),
        ('learning_certifications', 'course_version_hash'),
        ('learning_certifications', 'evidence_snapshot'),
        ('learning_certifications', 'decision_rationale'),
        ('dpo_review_items', 'decision_rationale')
    ) AS expected(table_name, column_name)
   WHERE NOT EXISTS (
    SELECT 1
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = expected.table_name
       AND c.column_name = expected.column_name
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Evidence Foundation columns: %', v_missing;
  END IF;
END;
$$;

DO $$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(trigger_name)
    INTO v_missing
    FROM (
      VALUES
        ('trg_platform_event_ledger_no_mutation'),
        ('trg_learning_page_attempts_evidence_pin'),
        ('trg_learning_page_attempts_event'),
        ('trg_learning_lesson_attempts_evidence_pin'),
        ('trg_learning_lesson_attempts_event'),
        ('trg_learning_certifications_evidence_pin'),
        ('trg_learning_certifications_event'),
        ('trg_dpo_review_items_decision_event')
    ) AS expected(trigger_name)
   WHERE NOT EXISTS (
    SELECT 1
      FROM information_schema.triggers t
     WHERE t.trigger_schema = 'public'
       AND t.trigger_name = expected.trigger_name
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing Evidence Foundation triggers: %', v_missing;
  END IF;
END;
$$;
