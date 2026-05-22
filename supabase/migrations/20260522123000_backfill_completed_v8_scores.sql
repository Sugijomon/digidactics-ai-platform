-- Backfill V8.1 scores for completed survey runs that predate the live scoring
-- implementation. This is idempotent and safe to rerun: calculate_v8_score
-- upserts run-level results and rewrites tool-level results for the run.

DO $$
DECLARE
  v_run record;
BEGIN
  FOR v_run IN
    SELECT sr.id
      FROM public.survey_run sr
      LEFT JOIN public.risk_result rr
        ON rr.survey_run_id = sr.id
     WHERE sr.completed_at IS NOT NULL
       AND rr.survey_run_id IS NULL
     ORDER BY sr.completed_at, sr.id
  LOOP
    BEGIN
      PERFORM public.calculate_v8_score(v_run.id);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.audit_events (
        org_id,
        event_type,
        actor_id,
        actor_kind,
        subject_table,
        subject_id,
        payload
      )
      SELECT
        sr.org_id,
        'scoring_backfill_failed',
        NULL,
        'system',
        'survey_run',
        sr.id::text,
        jsonb_build_object('run_id', sr.id, 'sqlerrm', SQLERRM)
      FROM public.survey_run sr
      WHERE sr.id = v_run.id;
    END;
  END LOOP;
END$$;
