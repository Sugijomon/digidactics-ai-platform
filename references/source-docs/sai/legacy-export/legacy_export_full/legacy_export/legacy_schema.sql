--
-- PostgreSQL database dump
--

\restrict kH5fBJQCKyP8WP9vRZstNEQTRYLrWeSjNUcPADEere3dCC534qp6hV699SBM2ea

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'user',
    'super_admin',
    'content_editor',
    'org_admin',
    'manager',
    'dpo'
);


--
-- Name: assessment_route; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessment_route AS ENUM (
    'green',
    'yellow',
    'orange',
    'red'
);


--
-- Name: assessment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessment_status AS ENUM (
    'active',
    'paused',
    'stopped',
    'superseded',
    'pending_review',
    'pending_dpo'
);


--
-- Name: dpo_notification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dpo_notification_status AS ENUM (
    'pending',
    'seen',
    'actioned',
    'dismissed'
);


--
-- Name: dpo_notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dpo_notification_type AS ENUM (
    'orange_route_new',
    'red_route_blocked',
    'incident_high',
    'reexam_required',
    'tool_discovery_pending'
);


--
-- Name: incident_dpo_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_dpo_action AS ENUM (
    'auto_handled',
    'reviewed',
    'intervention_planned',
    'resolved'
);


--
-- Name: incident_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_severity AS ENUM (
    'low',
    'medium',
    'high'
);


--
-- Name: learning_content_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.learning_content_type AS ENUM (
    'course',
    'module',
    'assessment',
    'document',
    'microlearning'
);


--
-- Name: learning_difficulty_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.learning_difficulty_level AS ENUM (
    'basic',
    'intermediate',
    'advanced'
);


--
-- Name: learning_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.learning_status AS ENUM (
    'draft',
    'published',
    'deprecated'
);


--
-- Name: org_notification_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_notification_severity AS ENUM (
    'info',
    'warning',
    'critical'
);


--
-- Name: org_notification_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_notification_source AS ENUM (
    'scan_engine',
    'model_library',
    'system'
);


--
-- Name: question_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_type AS ENUM (
    'multiple_choice',
    'multiple_select',
    'true_false',
    'fill_in',
    'essay'
);


--
-- Name: routing_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.routing_method AS ENUM (
    'deterministic',
    'claude_assisted'
);


--
-- Name: assign_microlearning_on_orange_assessment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_microlearning_on_orange_assessment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_library_item_id  UUID;
  v_context_card     TEXT;
BEGIN
  -- Alleen voor oranje route
  IF NEW.route != 'orange' THEN
    RETURN NEW;
  END IF;

  -- Zoek de bijbehorende micro-learning op basis van primair archetype
  SELECT library_item_id, context_card_text
    INTO v_library_item_id, v_context_card
    FROM public.archetype_ml_map
    WHERE archetype_code = NEW.primary_archetype
      AND is_active = true
    LIMIT 1;

  -- Alleen doorgaan als er een module gekoppeld is
  IF v_library_item_id IS NOT NULL THEN
    INSERT INTO public.assessment_ml_assignments (
      assessment_id,
      user_id,
      library_item_id,
      is_required,
      context_card_text
    ) VALUES (
      NEW.id,
      NEW.created_by,
      v_library_item_id,
      true,
      v_context_card
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: audit_log_profile_active(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_profile_active() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, target_user_id, org_id, old_value, new_value)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      CASE WHEN NEW.is_active = false THEN 'user.deactivate' ELSE 'user.reactivate' END,
      'profiles',
      NEW.id,
      NEW.id,
      NEW.org_id,
      jsonb_build_object('is_active', OLD.is_active),
      jsonb_build_object('is_active', NEW.is_active)
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: audit_log_user_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_log_user_roles() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, target_user_id, org_id, old_value, new_value)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'role.assign',
      'user_roles',
      NEW.id,
      NEW.user_id,
      NEW.org_id,
      NULL,
      jsonb_build_object('role', NEW.role::text, 'org_id', NEW.org_id::text)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, target_user_id, org_id, old_value, new_value)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'role.revoke',
      'user_roles',
      OLD.id,
      OLD.user_id,
      OLD.org_id,
      jsonb_build_object('role', OLD.role::text, 'org_id', OLD.org_id::text),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: award_badge(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.award_badge(_user_id uuid, _org_id uuid, _badge_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Validate badge_type
  IF _badge_type NOT IN ('early_adopter', 'ai_scout') THEN
    RAISE EXCEPTION 'Invalid badge_type: %', _badge_type;
  END IF;
  
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- User can only award badges to themselves (system validates the logic)
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Cannot award badges to other users';
  END IF;
  
  INSERT INTO public.user_badges (user_id, org_id, badge_type)
  VALUES (_user_id, _org_id, _badge_type)
  ON CONFLICT (user_id, badge_type) DO NOTHING;
END;
$$;


--
-- Name: check_activation_after_dpo_action(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_activation_after_dpo_action() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ml_completed BOOLEAN;
  v_assignment_exists BOOLEAN;
BEGIN
  IF NEW.status != 'actioned' OR OLD.status = 'actioned' THEN
    RETURN NEW;
  END IF;

  IF NEW.assessment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.assessment_ml_assignments
    WHERE assessment_id = NEW.assessment_id
      AND is_required = true
  ) INTO v_assignment_exists;

  IF NOT v_assignment_exists THEN
    UPDATE public.assessments
      SET status = 'active', updated_at = now()
      WHERE id = NEW.assessment_id
        AND status = 'pending_dpo';
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.assessment_ml_completions amc
    JOIN public.assessment_ml_assignments ama
      ON ama.assessment_id = amc.assessment_id
      AND ama.library_item_id = amc.library_item_id
    WHERE amc.assessment_id = NEW.assessment_id
      AND ama.is_required = true
  ) INTO v_ml_completed;

  IF v_ml_completed THEN
    UPDATE public.assessments
      SET status = 'active', updated_at = now()
      WHERE id = NEW.assessment_id
        AND status = 'pending_dpo';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_activation_after_ml_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_activation_after_ml_completion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_dpo_actioned BOOLEAN;
  v_assignment_required BOOLEAN;
BEGIN
  SELECT is_required INTO v_assignment_required
    FROM public.assessment_ml_assignments
    WHERE assessment_id = NEW.assessment_id
      AND user_id = NEW.user_id
    LIMIT 1;

  IF NOT v_assignment_required THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.dpo_notifications
    WHERE assessment_id = NEW.assessment_id
      AND status = 'actioned'
  ) INTO v_dpo_actioned;

  IF v_dpo_actioned THEN
    UPDATE public.assessments
      SET status = 'active',
          updated_at = now()
      WHERE id = NEW.assessment_id
        AND status = 'pending_dpo';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_org_admin_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_org_admin_limit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE admin_count INTEGER;
BEGIN
  IF NEW.role = 'org_admin' THEN
    SELECT COUNT(*) INTO admin_count FROM public.user_roles
    WHERE org_id = NEW.org_id AND role = 'org_admin'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF admin_count >= 2 THEN
      RAISE EXCEPTION 'Een organisatie mag maximaal 2 AI Verantwoordelijken hebben.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_quiz_answer(uuid, uuid, jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_quiz_answer(p_question_id uuid, p_lesson_id uuid, p_user_answer jsonb, p_time_spent integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_question record;
  v_is_correct boolean;
  v_points_earned integer;
  v_attempt_number integer;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_question
  FROM learning_questions
  WHERE id = p_question_id AND lesson_id = p_lesson_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  CASE v_question.question_type
    WHEN 'multiple_choice' THEN
      v_is_correct := (p_user_answer->>'selected') = (v_question.correct_answer->>'selected');
    WHEN 'true_false' THEN
      v_is_correct := (p_user_answer->>'selected')::boolean = (v_question.correct_answer->>'selected')::boolean;
    WHEN 'multiple_select' THEN
      v_is_correct := (
        SELECT array_agg(val ORDER BY val)
        FROM jsonb_array_elements_text(p_user_answer->'selected') AS val
      ) = (
        SELECT array_agg(val ORDER BY val)
        FROM jsonb_array_elements_text(v_question.correct_answer->'selected') AS val
      );
    WHEN 'fill_in' THEN
      v_is_correct := lower(trim(p_user_answer->>'text')) = lower(trim(v_question.correct_answer->>'text'));
      IF NOT v_is_correct AND v_question.question_config ? 'accept_variations' THEN
        SELECT EXISTS(
          SELECT 1 FROM jsonb_array_elements_text(v_question.question_config->'accept_variations') AS var
          WHERE lower(trim(var)) = lower(trim(p_user_answer->>'text'))
        ) INTO v_is_correct;
      END IF;
    WHEN 'essay' THEN
      v_is_correct := NULL;
    ELSE
      v_is_correct := false;
  END CASE;

  v_points_earned := CASE WHEN v_is_correct THEN COALESCE(v_question.points, 1) ELSE 0 END;

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
  FROM learning_answers
  WHERE question_id = p_question_id AND user_id = v_user_id;

  INSERT INTO learning_answers (
    user_id, question_id, lesson_id, user_answer,
    is_correct, points_earned, time_spent_seconds, attempt_number, org_id
  ) VALUES (
    v_user_id, p_question_id, p_lesson_id, p_user_answer,
    v_is_correct, v_points_earned, p_time_spent, v_attempt_number,
    get_user_org_id(v_user_id)
  );

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'points_earned', v_points_earned,
    'correct_answer', v_question.correct_answer,
    'explanation', v_question.explanation,
    'attempt_number', v_attempt_number
  );
END;
$$;


--
-- Name: dpo_risk_clusters(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dpo_risk_clusters(p_org_id uuid) RETURNS TABLE(cluster_id text, assigned_tier text, dominant_trigger text, respondent_count integer, avg_shadow numeric, avg_exposure numeric, avg_priority numeric, trigger_codes text[])
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_min_cell integer := 5;
BEGIN
  -- RBAC: caller moet super_admin, org_admin of dpo zijn voor deze org
  IF NOT (
    is_super_admin(auth.uid())
    OR (
      (is_org_admin(auth.uid()) OR is_dpo(auth.uid()))
      AND p_org_id = get_user_org_id(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'unauthorized: dpo_risk_clusters';
  END IF;

  -- Lees minimum cellgrootte uit scoring config (default 5)
  SELECT COALESCE(MAX(dashboard_min_cell_size), 5)
    INTO v_min_cell
    FROM scan_scoring_config
   WHERE org_id = p_org_id;

  RETURN QUERY
  WITH base AS (
    SELECT
      sr.id AS survey_run_id,
      rr.assigned_tier::text AS assigned_tier,
      rr.person_score,
      rr.review_trigger_codes,
      rr.highest_priority_score,
      COALESCE(
        (SELECT MAX(rrt.shadow_score) FROM risk_result_tool rrt WHERE rrt.survey_run_id = sr.id),
        0
      ) AS max_shadow,
      COALESCE(
        (SELECT MAX(rrt.exposure_score) FROM risk_result_tool rrt WHERE rrt.survey_run_id = sr.id),
        0
      ) AS max_exposure
    FROM survey_run sr
    JOIN risk_result rr ON rr.survey_run_id = sr.id
    WHERE sr.org_id = p_org_id
      AND sr.completed_at IS NOT NULL
  ),
  with_dominant AS (
    SELECT
      b.*,
      COALESCE(
        (SELECT t FROM unnest(b.review_trigger_codes) AS t
          WHERE t IN ('prohibited_tool','special_category_data','hr_evaluation_context','agentic_usage')
          LIMIT 1),
        COALESCE(b.review_trigger_codes[1], 'none')
      ) AS dom_trigger
    FROM base b
  ),
  grouped AS (
    SELECT
      assigned_tier,
      dom_trigger,
      COUNT(*)::int AS n,
      AVG(max_shadow)::numeric(5,2) AS avg_shadow,
      AVG(max_exposure)::numeric(5,2) AS avg_exposure,
      AVG(highest_priority_score)::numeric(5,2) AS avg_priority,
      array_agg(DISTINCT trig) FILTER (WHERE trig IS NOT NULL) AS triggers
    FROM with_dominant
    LEFT JOIN LATERAL unnest(review_trigger_codes) AS trig ON true
    GROUP BY assigned_tier, dom_trigger
  ),
  classified AS (
    SELECT
      g.*,
      (g.n >= v_min_cell) AS is_visible
    FROM grouped g
  ),
  small_merged AS (
    -- Kleine clusters samenvoegen tot één 'klein'-cluster per tier
    SELECT
      'klein-' || assigned_tier AS cluster_id,
      assigned_tier,
      'samengevoegd'::text AS dominant_trigger,
      SUM(n)::int AS respondent_count,
      AVG(avg_shadow)::numeric(5,2) AS avg_shadow,
      AVG(avg_exposure)::numeric(5,2) AS avg_exposure,
      AVG(avg_priority)::numeric(5,2) AS avg_priority,
      ARRAY(SELECT DISTINCT unnest(array_agg(triggers))) AS trigger_codes
    FROM classified
    WHERE NOT is_visible
    GROUP BY assigned_tier
    HAVING SUM(n) > 0
  ),
  visible AS (
    SELECT
      'c-' || md5(assigned_tier || '|' || dom_trigger) AS cluster_id,
      assigned_tier,
      dom_trigger AS dominant_trigger,
      n AS respondent_count,
      avg_shadow,
      avg_exposure,
      avg_priority,
      COALESCE(triggers, ARRAY[]::text[]) AS trigger_codes
    FROM classified
    WHERE is_visible
  )
  SELECT * FROM visible
  UNION ALL
  SELECT * FROM small_merged
  ORDER BY avg_priority DESC NULLS LAST, respondent_count DESC;
END;
$$;


--
-- Name: finalize_lesson_attempt(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_lesson_attempt(p_attempt_id uuid, p_quiz_answers jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_attempt record;
  v_lesson record;
  v_blocks jsonb;
  v_block jsonb;
  v_topic jsonb;
  v_block_id text;
  v_block_type text;
  v_block_points integer;
  v_earned integer := 0;
  v_max integer := 0;
  v_percentage numeric;
  v_passed boolean;
  v_time_spent integer;
  v_user_id uuid;
  v_correct boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_attempt FROM lesson_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_attempt.user_id != v_user_id THEN RAISE EXCEPTION 'Not your attempt'; END IF;
  IF v_attempt.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Attempt already completed'; END IF;

  SELECT * INTO v_lesson FROM lessons WHERE id = v_attempt.lesson_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesson not found'; END IF;

  v_blocks := v_lesson.blocks;

  -- Process all quiz blocks from lesson structure
  -- Version 2 (topics) or legacy (flat array)
  FOR v_block IN
    SELECT blk FROM (
      SELECT jsonb_array_elements(jsonb_array_elements(v_blocks->'topics')->'blocks') AS blk
      WHERE v_blocks ? 'topics'
      UNION ALL
      SELECT jsonb_array_elements(v_blocks) AS blk
      WHERE jsonb_typeof(v_blocks) = 'array'
    ) sub
  LOOP
    v_block_type := v_block->>'type';
    v_block_id := v_block->>'id';
    v_block_points := COALESCE((v_block->>'points')::integer, 10);

    -- Only process quiz blocks (skip essays — not auto-graded)
    IF v_block_type IN ('quiz_mc', 'quiz_tf', 'quiz_ms', 'quiz_fill') THEN
      v_max := v_max + v_block_points;

      IF p_quiz_answers ? v_block_id THEN
        v_correct := false;

        CASE v_block_type
          WHEN 'quiz_mc' THEN
            v_correct := (p_quiz_answers->v_block_id)::integer = (v_block->>'correct_answer')::integer;
          WHEN 'quiz_tf' THEN
            v_correct := (p_quiz_answers->>v_block_id)::boolean = (v_block->>'correct_answer')::boolean;
          WHEN 'quiz_ms' THEN
            v_correct := (
              SELECT array_agg(val::integer ORDER BY val::integer)
              FROM jsonb_array_elements_text(p_quiz_answers->v_block_id) AS val
            ) = (
              SELECT array_agg(val::integer ORDER BY val::integer)
              FROM jsonb_array_elements_text(v_block->'correct_answers') AS val
            );
          WHEN 'quiz_fill' THEN
            v_correct := lower(trim(p_quiz_answers->>v_block_id)) = lower(trim(v_block->>'correct_answer'));
            IF NOT v_correct AND v_block ? 'accept_variations' THEN
              SELECT EXISTS(
                SELECT 1 FROM jsonb_array_elements_text(v_block->'accept_variations') AS var
                WHERE lower(trim(var)) = lower(trim(p_quiz_answers->>v_block_id))
              ) INTO v_correct;
            END IF;
          ELSE
            v_correct := false;
        END CASE;

        IF v_correct THEN
          v_earned := v_earned + v_block_points;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Calculate percentage and pass/fail
  IF v_max > 0 THEN
    v_percentage := round((v_earned::numeric / v_max::numeric) * 100);
  ELSE
    v_percentage := 100;
  END IF;

  v_passed := v_percentage >= COALESCE(v_lesson.passing_score, 80);
  v_time_spent := EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::integer;

  -- Enable system write flag for trigger bypass
  PERFORM set_config('app.system_write', 'true', true);

  UPDATE lesson_attempts SET
    score = v_earned,
    max_score = v_max,
    percentage = v_percentage,
    passed = v_passed,
    time_spent = v_time_spent,
    completed_at = now()
  WHERE id = p_attempt_id;

  PERFORM set_config('app.system_write', 'false', true);

  -- Also write completion record
  INSERT INTO user_lesson_completions (user_id, lesson_id, score, time_spent, completed_at, org_id)
  VALUES (v_user_id, v_attempt.lesson_id, v_percentage, v_time_spent, now(), get_user_org_id(v_user_id))
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    score = EXCLUDED.score,
    time_spent = EXCLUDED.time_spent,
    completed_at = EXCLUDED.completed_at;

  RETURN jsonb_build_object(
    'earned_points', v_earned,
    'max_points', v_max,
    'percentage', v_percentage,
    'passed', v_passed,
    'time_spent', v_time_spent
  );
END;
$$;


--
-- Name: get_lesson_questions_for_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_lesson_questions_for_student(p_lesson_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'lesson_id', lesson_id,
        'question_type', question_type,
        'question_text', question_text,
        'question_config', question_config,
        'points', points,
        'order_index', order_index,
        'is_required', is_required,
        'org_id', org_id,
        'created_at', created_at,
        'updated_at', updated_at
      ) ORDER BY order_index
    )
    FROM learning_questions
    WHERE lesson_id = p_lesson_id
  ), '[]'::jsonb);
END;
$$;


--
-- Name: get_user_org_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_org_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT org_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = _user_id 
  ORDER BY CASE role 
    WHEN 'super_admin' THEN 1 WHEN 'content_editor' THEN 2 
    WHEN 'org_admin' THEN 3 WHEN 'manager' THEN 4 WHEN 'user' THEN 5 ELSE 6 END
  LIMIT 1;
$$;


--
-- Name: grant_rijbewijs_on_exam_pass(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_rijbewijs_on_exam_pass() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.passed = true THEN
    DECLARE v_lesson_type TEXT;
    BEGIN
      SELECT lesson_type INTO v_lesson_type FROM public.lessons WHERE id = NEW.lesson_id;
      IF v_lesson_type = 'ai_literacy_exam' THEN
        INSERT INTO public.rijbewijs_records (user_id, org_id, lesson_attempt_id)
          VALUES (NEW.user_id, NEW.org_id, NEW.id)
          ON CONFLICT (user_id) DO UPDATE SET
            status = 'active',
            earned_at = NOW(),
            lesson_attempt_id = NEW.id;
        UPDATE public.profiles SET
          has_ai_rijbewijs = true,
          ai_rijbewijs_obtained_at = NOW()
        WHERE id = NEW.user_id;
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  default_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  org_user_count INTEGER;
BEGIN
  -- Insert the profile with default org
  INSERT INTO public.profiles (id, email, full_name, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    org_id = COALESCE(profiles.org_id, default_org_id);
  
  -- Check if this is the first user in the organization
  SELECT COUNT(*) INTO org_user_count 
  FROM public.profiles 
  WHERE org_id = default_org_id;
  
  -- If first user in org, grant org_admin role (changed from 'admin')
  IF org_user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role, org_id)
    VALUES (NEW.id, 'org_admin', default_org_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') THEN TRUE
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END;
$$;


--
-- Name: is_content_editor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_content_editor(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = 'content_editor'
  );
$$;


--
-- Name: is_dpo(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_dpo(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'dpo'
  );
$$;


--
-- Name: is_manager(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_manager(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = 'manager'
  );
$$;


--
-- Name: is_org_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_org_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = 'org_admin'
  );
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = 'super_admin'
  );
$$;


--
-- Name: notify_dpo_on_assessment_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_dpo_on_assessment_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'pending_review' AND OLD.status IS DISTINCT FROM 'pending_review' THEN
    INSERT INTO public.dpo_notifications (org_id, assessment_id, type, status)
    VALUES (NEW.org_id, NEW.id, 'orange_route_new', 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_dpo_on_incident(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_dpo_on_incident() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.severity IN ('medium', 'high') THEN
    INSERT INTO public.dpo_notifications (org_id, type, status, notes)
    VALUES (NEW.org_id, 'incident_high', 'pending',
            CONCAT('Incident gemeld — ernst: ', NEW.severity::text, '. Beschrijving: ', left(NEW.description, 200)));
    UPDATE public.incidents SET dpo_notified = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_dpo_on_orange_assessment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_dpo_on_orange_assessment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.route = 'orange' OR NEW.status = 'pending_review' THEN
    INSERT INTO public.dpo_notifications (org_id, assessment_id, type, status)
    VALUES (NEW.org_id, NEW.id, 'orange_route_new', 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: protect_lesson_attempt_scores(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_lesson_attempt_scores() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF current_setting('app.system_write', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.passed := OLD.passed;
  NEW.score := OLD.score;
  NEW.max_score := OLD.max_score;
  NEW.percentage := OLD.percentage;
  NEW.completed_at := OLD.completed_at;
  RETURN NEW;
END;
$$;


--
-- Name: protect_rijbewijs_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_rijbewijs_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Allow if called from the system trigger (no auth context = service role)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Allow super_admin (platform maintenance only)
  IF is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  
  -- Block any change to rijbewijs fields by non-system actors
  IF OLD.has_ai_rijbewijs IS DISTINCT FROM NEW.has_ai_rijbewijs
     OR OLD.ai_rijbewijs_obtained_at IS DISTINCT FROM NEW.ai_rijbewijs_obtained_at THEN
    RAISE EXCEPTION 'AI Rijbewijs kan alleen worden toegekend via het examensysteem.';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: protect_survey_run_immutable_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_survey_run_immutable_fields() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.org_id IS NOT NULL AND NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'org_id mag niet worden gewijzigd na aanmaak';
  END IF;
  IF OLD.wave_id IS NOT NULL AND NEW.wave_id IS DISTINCT FROM OLD.wave_id THEN
    RAISE EXCEPTION 'wave_id mag niet worden gewijzigd na aanmaak';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sanitize_lesson_attempt_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sanitize_lesson_attempt_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.passed := false;
  NEW.score := NULL;
  NEW.max_score := NULL;
  NEW.percentage := NULL;
  NEW.completed_at := NULL;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: validate_badge_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_badge_type() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.badge_type NOT IN ('early_adopter', 'ai_scout') THEN
    RAISE EXCEPTION 'badge_type must be one of: early_adopter, ai_scout';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_model_typekaart_updates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_model_typekaart_updates() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.change_type IS NOT NULL AND NEW.change_type NOT IN ('major', 'minor', 'patch') THEN
    RAISE EXCEPTION 'change_type must be one of: major, minor, patch';
  END IF;
  IF NEW.confidence IS NOT NULL AND NEW.confidence NOT IN ('high', 'medium', 'low') THEN
    RAISE EXCEPTION 'confidence must be one of: high, medium, low';
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'status must be one of: pending, approved, rejected';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_model_typekaarten(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_model_typekaarten() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.eu_license_status IS NOT NULL AND NEW.eu_license_status NOT IN ('open', 'restricted', 'prohibited', 'unknown') THEN
    RAISE EXCEPTION 'eu_license_status must be one of: open, restricted, prohibited, unknown';
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('draft', 'published', 'deprecated') THEN
    RAISE EXCEPTION 'status must be one of: draft, published, deprecated';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_org_tools_catalog_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_org_tools_catalog_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status NOT IN ('known_unconfigured', 'approved', 'under_review', 'not_approved') THEN
    RAISE EXCEPTION 'status must be one of: known_unconfigured, approved, under_review, not_approved';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_plan_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_plan_type() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.plan_type NOT IN ('shadow_only', 'routeai', 'both') THEN
    RAISE EXCEPTION 'plan_type must be one of: shadow_only, routeai, both';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_shadow_survey_runs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_shadow_survey_runs() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.data_classification IS NOT NULL AND NEW.data_classification NOT IN ('public','internal','client','sensitive') THEN
    RAISE EXCEPTION 'data_classification must be one of: public, internal, client, sensitive';
  END IF;
  IF NEW.assigned_tier IS NOT NULL AND NEW.assigned_tier NOT IN ('standard','advanced','custom') THEN
    RAISE EXCEPTION 'assigned_tier must be one of: standard, advanced, custom';
  END IF;
  IF NEW.risk_score IS NOT NULL AND (NEW.risk_score < 0 OR NEW.risk_score > 100) THEN
    RAISE EXCEPTION 'risk_score must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_tool_discovery_risk_class(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_tool_discovery_risk_class() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.application_risk_class IS NOT NULL
     AND NEW.application_risk_class NOT IN ('minimal', 'limited', 'high', 'unacceptable') THEN
    RAISE EXCEPTION 'application_risk_class must be one of: minimal, limited, high, unacceptable';
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _legacy_tools_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._legacy_tools_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    tool_id uuid NOT NULL,
    is_enabled boolean DEFAULT false,
    custom_guidelines text,
    custom_risk_notes text,
    custom_display_name text,
    contract_reference text,
    procurement_date date,
    contract_expiry_date date,
    procurement_contact text,
    cost_center text,
    usage_limits text,
    monthly_cost numeric(10,2),
    allowed_roles text[] DEFAULT '{user,manager,org_admin}'::text[],
    requires_approval boolean DEFAULT false,
    custom_icon_url text,
    display_priority integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    action text NOT NULL,
    target_table text NOT NULL,
    target_id uuid NOT NULL,
    target_user_id uuid,
    org_id uuid,
    old_value jsonb,
    new_value jsonb,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: archetype_ml_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archetype_ml_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    archetype_code text NOT NULL,
    library_item_id uuid NOT NULL,
    context_card_text text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: assessment_ml_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_ml_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    library_item_id uuid NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    context_card_text text,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assessment_ml_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_ml_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    library_item_id uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    module_version text
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tool_id uuid,
    tool_name_raw text NOT NULL,
    survey_answers jsonb NOT NULL,
    route public.assessment_route NOT NULL,
    primary_archetype text NOT NULL,
    secondary_archetypes text[] DEFAULT '{}'::text[],
    archetype_refs text[] NOT NULL,
    escalation_refs text[] DEFAULT '{}'::text[],
    plain_language text NOT NULL,
    routing_method public.routing_method DEFAULT 'deterministic'::public.routing_method NOT NULL,
    decision_version text NOT NULL,
    claude_input_hash text,
    reason_filtered text,
    dpia_required boolean DEFAULT false NOT NULL,
    fria_required boolean DEFAULT false NOT NULL,
    transparency_required boolean DEFAULT false NOT NULL,
    transparency_template text,
    dpo_oversight_required boolean DEFAULT false NOT NULL,
    user_instructions text[] DEFAULT '{}'::text[],
    dpo_instructions text[] DEFAULT '{}'::text[],
    status public.assessment_status DEFAULT 'active'::public.assessment_status NOT NULL,
    reviewer_admin_id uuid,
    reviewed_at timestamp with time zone,
    eu_act_category text GENERATED ALWAYS AS (
CASE route
    WHEN 'green'::public.assessment_route THEN 'minimal_risk'::text
    WHEN 'yellow'::public.assessment_route THEN 'transparency_risk'::text
    WHEN 'orange'::public.assessment_route THEN 'high_risk'::text
    WHEN 'red'::public.assessment_route THEN 'prohibited'::text
    ELSE 'unknown'::text
END) STORED
);


--
-- Name: course_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid,
    lesson_id uuid,
    sequence_order integer NOT NULL,
    is_required boolean DEFAULT true
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    required_for_onboarding boolean DEFAULT false,
    passing_threshold integer DEFAULT 80,
    unlocks_capability text,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    org_id uuid NOT NULL
);


--
-- Name: dpo_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dpo_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    assessment_id uuid,
    type public.dpo_notification_type NOT NULL,
    status public.dpo_notification_status DEFAULT 'pending'::public.dpo_notification_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    seen_at timestamp with time zone,
    actioned_at timestamp with time zone,
    actioned_by uuid,
    notes text
);


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    assessment_id uuid,
    reported_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text NOT NULL,
    severity public.incident_severity NOT NULL,
    output_used text,
    dpo_notified boolean DEFAULT false NOT NULL,
    dpo_reviewed_at timestamp with time zone,
    dpo_notes text,
    dpo_action public.incident_dpo_action,
    dpo_reviewed_by uuid,
    CONSTRAINT incidents_output_used_check CHECK ((output_used = ANY (ARRAY['yes_unchecked'::text, 'no_manual_check'::text, 'yes_after_correction'::text])))
);


--
-- Name: learning_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    user_answer jsonb NOT NULL,
    is_correct boolean,
    points_earned integer DEFAULT 0,
    time_spent_seconds integer,
    attempt_number integer DEFAULT 1,
    org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    answered_at timestamp with time zone DEFAULT now()
);


--
-- Name: learning_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    library_item_id uuid NOT NULL,
    is_enabled boolean DEFAULT false,
    is_mandatory boolean DEFAULT false,
    custom_title text,
    custom_intro text,
    custom_notes text,
    assigned_to_roles text[],
    priority integer DEFAULT 0,
    custom_deadline date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    custom_completion_message text,
    completion_reward_points integer DEFAULT 0
);


--
-- Name: learning_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    content jsonb DEFAULT '{}'::jsonb,
    version text DEFAULT '1.0'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    content_type public.learning_content_type NOT NULL,
    difficulty_level public.learning_difficulty_level DEFAULT 'basic'::public.learning_difficulty_level,
    estimated_duration_minutes integer,
    learning_objectives text[] DEFAULT '{}'::text[],
    required_for_license text[] DEFAULT '{}'::text[],
    status public.learning_status DEFAULT 'draft'::public.learning_status NOT NULL,
    cluster_id text,
    archetype_codes text[] DEFAULT '{}'::text[],
    is_activation_req boolean DEFAULT false,
    context_card text,
    lesson_id uuid
);


--
-- Name: learning_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid,
    question_type public.question_type NOT NULL,
    question_text text NOT NULL,
    question_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    correct_answer jsonb DEFAULT '{}'::jsonb NOT NULL,
    points integer DEFAULT 1,
    explanation text,
    order_index integer DEFAULT 0 NOT NULL,
    is_required boolean DEFAULT true,
    org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT learning_questions_points_check CHECK ((points > 0))
);


--
-- Name: shadow_survey_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shadow_survey_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    user_id uuid,
    survey_version text DEFAULT '1.0'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now(),
    ai_maturity_score integer,
    department text,
    role_description text,
    amnesty_acknowledged boolean DEFAULT false,
    assigned_tier text,
    data_classification text,
    primary_use_case text,
    primary_concern text,
    risk_score integer,
    dpo_review_required boolean DEFAULT false,
    review_notes text,
    survey_completed_at timestamp with time zone,
    extra_data jsonb DEFAULT '{}'::jsonb,
    scoreboard_name_visible boolean DEFAULT false,
    CONSTRAINT shadow_survey_runs_ai_maturity_score_check CHECK (((ai_maturity_score >= 1) AND (ai_maturity_score <= 5)))
);


--
-- Name: legacy_survey_participation_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.legacy_survey_participation_view WITH (security_invoker='on') AS
 SELECT id,
    org_id,
    user_id,
    amnesty_acknowledged,
    submitted_at,
    assigned_tier
   FROM public.shadow_survey_runs;


--
-- Name: lesson_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    score integer,
    max_score integer,
    percentage integer,
    passed boolean DEFAULT false,
    time_spent integer,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    lesson_type text DEFAULT 'standalone'::text NOT NULL,
    blocks jsonb DEFAULT '[]'::jsonb NOT NULL,
    estimated_duration integer,
    passing_score integer,
    is_published boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    org_id uuid NOT NULL
);


--
-- Name: model_typekaart_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_typekaart_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    typekaart_id uuid NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    change_type text,
    source text,
    confidence text,
    approved_by uuid,
    approved_at timestamp with time zone,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: model_typekaarten; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_typekaarten (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    canonical_id text NOT NULL,
    display_name text NOT NULL,
    provider text NOT NULL,
    model_type text NOT NULL,
    gpai_designated boolean DEFAULT false,
    systemic_risk boolean DEFAULT false,
    eu_license_status text DEFAULT 'unknown'::text,
    hosting_region text,
    data_storage_region text,
    trains_on_input boolean DEFAULT false,
    dpa_available boolean DEFAULT false,
    statutory_prohibitions jsonb DEFAULT '[]'::jsonb,
    contractual_restrictions jsonb DEFAULT '[]'::jsonb,
    typekaart_version text DEFAULT '1.0'::text,
    last_verified_at timestamp with time zone,
    status text DEFAULT 'draft'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: org_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    source public.org_notification_source NOT NULL,
    severity public.org_notification_severity DEFAULT 'info'::public.org_notification_severity NOT NULL,
    title text NOT NULL,
    body text,
    action_url text,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    read_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);


--
-- Name: org_tool_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_tool_policy (
    org_id uuid NOT NULL,
    tool_code character varying(64) NOT NULL,
    org_policy_status_code character varying(32) DEFAULT 'newly_discovered'::character varying NOT NULL,
    eu_ai_act_flag_code character varying(64) DEFAULT 'none'::character varying NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now(),
    decided_by character varying(128),
    decided_at timestamp with time zone,
    notes text
);


--
-- Name: org_tools_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_tools_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    tool_name text NOT NULL,
    status text DEFAULT 'known_unconfigured'::text NOT NULL,
    typekaart_id uuid,
    added_by uuid,
    added_at timestamp with time zone DEFAULT now(),
    notes text,
    override_data_storage text,
    override_trains_on_input boolean,
    override_acknowledged_by uuid,
    override_acknowledged_at timestamp with time zone,
    first_seen_at timestamp with time zone DEFAULT now()
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    sector text,
    country text DEFAULT 'NL'::text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    subscription_type text DEFAULT 'basic'::text,
    subscription_start_date date DEFAULT CURRENT_DATE,
    subscription_end_date date,
    contact_person text,
    contact_email text,
    street_address text,
    postal_code text,
    city text,
    contact_phone text,
    bank_account text,
    bank_name text,
    plan_type text DEFAULT 'routeai'::text NOT NULL,
    scoreboard_slug text,
    scoreboard_enabled boolean DEFAULT false NOT NULL,
    scoreboard_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT organizations_plan_type_check CHECK ((plan_type = ANY (ARRAY['shadow_only'::text, 'routeai'::text, 'both'::text]))),
    CONSTRAINT organizations_status_check CHECK ((status = ANY (ARRAY['trial'::text, 'active'::text, 'test'::text, 'inactive'::text, 'expired'::text, 'suspended'::text]))),
    CONSTRAINT organizations_subscription_type_check CHECK ((subscription_type = ANY (ARRAY['basic'::text, 'premium'::text, 'enterprise'::text])))
);


--
-- Name: passport_identity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.passport_identity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    org_description text,
    dpo_name text,
    dpo_email text,
    ai_policy_url text,
    governance_scope text,
    review_cycle text DEFAULT 'Jaarlijks'::text,
    last_reviewed_at date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    department text,
    has_ai_rijbewijs boolean DEFAULT false,
    ai_rijbewijs_obtained_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    import_batch_id text,
    routeai_invited_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    has_set_password boolean DEFAULT false NOT NULL,
    banner_password_dismissed boolean DEFAULT false NOT NULL
);


--
-- Name: ref_account_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_account_type (
    code character varying(32) NOT NULL,
    label character varying(128) NOT NULL
);


--
-- Name: ref_ai_frequency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_ai_frequency (
    code character varying(32) NOT NULL,
    label character varying(128) NOT NULL,
    sort_order integer NOT NULL
);


--
-- Name: ref_catalog_beheerstatus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_catalog_beheerstatus (
    code character varying(32) NOT NULL,
    label character varying(128) NOT NULL
);


--
-- Name: ref_context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_context (
    code character varying(64) NOT NULL,
    label character varying(128) NOT NULL,
    context_multiplier numeric(4,2) DEFAULT 1.0 NOT NULL
);


--
-- Name: ref_data_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_data_type (
    code character varying(64) NOT NULL,
    label character varying(128) NOT NULL,
    risk_level character varying(16) DEFAULT 'low'::character varying NOT NULL
);


--
-- Name: ref_department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_department (
    code character varying(64) NOT NULL,
    label character varying(128) NOT NULL,
    sort_order integer NOT NULL
);


--
-- Name: ref_eu_ai_act_flag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_eu_ai_act_flag (
    code character varying(64) NOT NULL,
    label character varying(128) NOT NULL
);


--
-- Name: ref_governance_flag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_governance_flag (
    code character varying(64) NOT NULL,
    label character varying(128) NOT NULL
);


--
-- Name: ref_no_ai_reason; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_no_ai_reason (
    code character varying(32) NOT NULL,
    label character varying(128) NOT NULL
);


--
-- Name: ref_org_policy_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_org_policy_status (
    code character varying(32) NOT NULL,
    label character varying(128) NOT NULL,
    shadow_base numeric(5,2) NOT NULL
);


--
-- Name: ref_review_trigger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_review_trigger (
    code character varying(64) NOT NULL,
    label character varying(128) NOT NULL,
    description text
);


--
-- Name: ref_use_case; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_use_case (
    code character varying(64) NOT NULL,
    label character varying(128) NOT NULL,
    use_case_base numeric(5,2) DEFAULT 20 NOT NULL
);


--
-- Name: rijbewijs_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rijbewijs_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_id uuid,
    lesson_attempt_id uuid,
    exam_version text DEFAULT '1.0'::text NOT NULL,
    earned_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT rijbewijs_records_status_check CHECK ((status = ANY (ARRAY['active'::text, 'superseded'::text, 'reexam_required'::text])))
);


--
-- Name: risk_result; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_result (
    survey_run_id uuid NOT NULL,
    person_score_raw numeric(6,2),
    person_score numeric(5,2) DEFAULT 0 NOT NULL,
    assigned_tier character varying(16) DEFAULT 'green'::character varying NOT NULL,
    dpo_review_required boolean DEFAULT false NOT NULL,
    toxic_combination boolean DEFAULT false NOT NULL,
    shadow_tool_count integer DEFAULT 0 NOT NULL,
    review_trigger_codes text[],
    highest_risk_tool character varying(128),
    highest_risk_use_case character varying(128),
    highest_risk_context character varying(128),
    highest_priority_score numeric(5,2),
    hard_override boolean DEFAULT false NOT NULL,
    override_reason character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: risk_result_tool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_result_tool (
    survey_run_id uuid NOT NULL,
    survey_tool_id uuid NOT NULL,
    shadow_base numeric(5,2) DEFAULT 0 NOT NULL,
    shadow_score numeric(5,2) DEFAULT 0 NOT NULL,
    use_case_base numeric(5,2) DEFAULT 0 NOT NULL,
    context_multiplier numeric(4,2) DEFAULT 1.0 NOT NULL,
    account_multiplier numeric(4,2) DEFAULT 1.0 NOT NULL,
    data_boost numeric(5,2) DEFAULT 0 NOT NULL,
    frequency_boost numeric(5,2) DEFAULT 0 NOT NULL,
    automation_boost numeric(5,2) DEFAULT 0 NOT NULL,
    extension_boost numeric(5,2) DEFAULT 0 NOT NULL,
    agentic_boost numeric(5,2) DEFAULT 0 NOT NULL,
    raw_exposure_score numeric(6,2) DEFAULT 0 NOT NULL,
    exposure_score numeric(5,2) DEFAULT 0 NOT NULL,
    toxic_boost numeric(5,2) DEFAULT 0 NOT NULL,
    review_boost numeric(5,2) DEFAULT 0 NOT NULL,
    priority_score_raw numeric(6,2) DEFAULT 0 NOT NULL,
    priority_score numeric(5,2) DEFAULT 0 NOT NULL,
    dpo_review_required boolean DEFAULT false NOT NULL,
    review_trigger_codes text[],
    scoring_config_id uuid,
    priority_review_threshold_used numeric(5,2),
    toxic_shadow_threshold_used numeric(5,2),
    toxic_exposure_threshold_used numeric(5,2),
    hard_override boolean DEFAULT false NOT NULL,
    override_reason character varying(255)
);


--
-- Name: scan_scoring_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scan_scoring_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    wave_id uuid,
    scoring_version character varying(32) DEFAULT 'V8.1'::character varying NOT NULL,
    priority_review_threshold numeric(5,2) DEFAULT 40 NOT NULL,
    toxic_shadow_threshold numeric(5,2) DEFAULT 50 NOT NULL,
    toxic_exposure_threshold numeric(5,2) DEFAULT 50 NOT NULL,
    dashboard_min_cell_size integer DEFAULT 5 NOT NULL,
    public_scoreboard_enabled boolean DEFAULT false NOT NULL,
    notes text,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active_from timestamp with time zone DEFAULT now() NOT NULL,
    active_until timestamp with time zone
);


--
-- Name: survey_data_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_data_type (
    survey_run_id uuid NOT NULL,
    data_type_code character varying(64) NOT NULL
);


--
-- Name: survey_invite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_invite (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wave_id uuid,
    org_id uuid NOT NULL,
    email character varying(320) NOT NULL,
    display_name character varying(255),
    department_label character varying(128),
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    reminder_sent_at timestamp with time zone,
    participation_status character varying(32) DEFAULT 'invited'::character varying NOT NULL
);


--
-- Name: survey_motivation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_motivation (
    survey_run_id uuid NOT NULL,
    motivation_code character varying(64) NOT NULL,
    motivation_other_text character varying(255)
);


--
-- Name: survey_participation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_participation (
    invite_id uuid NOT NULL,
    survey_run_id uuid,
    opened_at timestamp with time zone,
    completed_at timestamp with time zone,
    last_reminder_at timestamp with time zone
);


--
-- Name: survey_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_profile (
    survey_run_id uuid NOT NULL,
    department_code character varying(64),
    department_other_text character varying(255),
    ai_frequency_code character varying(32),
    no_ai_reason_code character varying(32),
    processing_output_code character varying(64),
    ai_policy_awareness_code character varying(64),
    ai_skill_level_code character varying(32),
    top_concern_other_text character varying(255),
    future_usecases_text text,
    browser_extension_usage_code character varying(64),
    extension_awareness_code character varying(64),
    automation_usage_code character varying(64),
    automation_awareness_code character varying(64),
    data_awareness_code character varying(64),
    anonymization_behavior_code character varying(64)
);


--
-- Name: survey_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_run (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wave_id uuid,
    org_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    locale character varying(16) DEFAULT 'nl'::character varying,
    source character varying(32) DEFAULT 'web'::character varying,
    consent_ambassador boolean,
    ambassador_email character varying(320),
    CONSTRAINT chk_ambassador CHECK (((consent_ambassador IS DISTINCT FROM true) OR (ambassador_email IS NOT NULL)))
);


--
-- Name: survey_support_need; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_support_need (
    survey_run_id uuid NOT NULL,
    support_need_code character varying(64) NOT NULL
);


--
-- Name: survey_tool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_tool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    survey_run_id uuid NOT NULL,
    tool_code character varying(64),
    tool_name character varying(128) NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    catalog_beheerstatus_code character varying(32),
    org_policy_status_code_snapshot character varying(32),
    eu_ai_act_flag_code_snapshot character varying(64)
);


--
-- Name: survey_tool_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_tool_account (
    survey_tool_id uuid NOT NULL,
    account_type_code character varying(32) NOT NULL
);


--
-- Name: survey_tool_preference_reason; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_tool_preference_reason (
    survey_run_id uuid NOT NULL,
    preference_reason_code character varying(64) NOT NULL
);


--
-- Name: survey_tool_use_case; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_tool_use_case (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    survey_tool_id uuid NOT NULL,
    use_case_code character varying(64) NOT NULL
);


--
-- Name: survey_tool_use_case_context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_tool_use_case_context (
    survey_tool_use_case_id uuid NOT NULL,
    context_code character varying(64) NOT NULL
);


--
-- Name: survey_tool_use_case_flag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_tool_use_case_flag (
    survey_tool_use_case_id uuid NOT NULL,
    governance_flag_code character varying(64) NOT NULL
);


--
-- Name: survey_top_concern; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_top_concern (
    survey_run_id uuid NOT NULL,
    top_concern_code character varying(64) NOT NULL
);


--
-- Name: survey_wave; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_wave (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    wave_name character varying(128) NOT NULL,
    wave_type character varying(32) DEFAULT 'baseline'::character varying NOT NULL,
    survey_version character varying(32),
    scoring_version character varying(32) DEFAULT 'V8.1'::character varying,
    policy_snapshot_date date,
    opens_at timestamp with time zone,
    closes_at timestamp with time zone,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tool_catalog_discovery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tool_catalog_discovery (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    survey_run_id uuid,
    survey_tool_id uuid,
    raw_tool_name character varying(128) NOT NULL,
    normalized_tool_name character varying(128),
    discovery_source character varying(32) DEFAULT 'survey'::character varying NOT NULL,
    review_status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    promoted_tool_code character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by character varying(128),
    notes text
);


--
-- Name: tool_discoveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tool_discoveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    survey_run_id uuid,
    submitted_by uuid,
    tool_name text NOT NULL,
    vendor text,
    use_case text,
    use_frequency text,
    data_types_used text[],
    department text,
    submitted_at timestamp with time zone DEFAULT now(),
    review_status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    resulting_tool_id uuid,
    application_risk_class text,
    eu_ai_act_context text,
    CONSTRAINT tool_discoveries_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'more_info_requested'::text]))),
    CONSTRAINT tool_discoveries_use_frequency_check CHECK ((use_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'occasionally'::text])))
);


--
-- Name: tools_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tools_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    vendor text NOT NULL,
    description text,
    hosting_location text,
    data_residency text,
    gpai_status boolean DEFAULT false,
    model_type text,
    capabilities text[] DEFAULT '{}'::text[],
    vendor_privacy_policy_url text,
    vendor_terms_url text,
    vendor_website_url text,
    api_available boolean DEFAULT false,
    contract_required boolean DEFAULT false,
    category text,
    version text DEFAULT '1.0'::text,
    status text DEFAULT 'draft'::text,
    org_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tools_library_category_check CHECK ((category = ANY (ARRAY['llm'::text, 'image_gen'::text, 'code_assistant'::text, 'rag'::text, 'analytics'::text, 'other'::text]))),
    CONSTRAINT tools_library_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'deprecated'::text])))
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_id uuid NOT NULL,
    badge_type text NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_course_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_course_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    final_score integer,
    capability_unlocked text,
    completed_at timestamp with time zone DEFAULT now(),
    org_id uuid
);


--
-- Name: user_course_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_course_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    lessons_completed integer DEFAULT 0,
    lessons_required integer NOT NULL,
    progress_percentage integer DEFAULT 0,
    started_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    org_id uuid
);


--
-- Name: user_lesson_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_lesson_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    score integer,
    time_spent integer,
    completed_at timestamp with time zone DEFAULT now(),
    org_id uuid
);


--
-- Name: user_lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    current_block_index integer DEFAULT 0,
    blocks_completed jsonb DEFAULT '[]'::jsonb,
    progress_percentage integer DEFAULT 0,
    quiz_attempts jsonb DEFAULT '{}'::jsonb,
    started_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    org_id uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL
);


--
-- Name: admin_audit_log admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: archetype_ml_map archetype_ml_map_archetype_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archetype_ml_map
    ADD CONSTRAINT archetype_ml_map_archetype_code_key UNIQUE (archetype_code);


--
-- Name: archetype_ml_map archetype_ml_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archetype_ml_map
    ADD CONSTRAINT archetype_ml_map_pkey PRIMARY KEY (id);


--
-- Name: assessment_ml_assignments assessment_ml_assignments_assessment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_assignments
    ADD CONSTRAINT assessment_ml_assignments_assessment_id_user_id_key UNIQUE (assessment_id, user_id);


--
-- Name: assessment_ml_assignments assessment_ml_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_assignments
    ADD CONSTRAINT assessment_ml_assignments_pkey PRIMARY KEY (id);


--
-- Name: assessment_ml_completions assessment_ml_completions_assessment_id_user_id_library_ite_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_completions
    ADD CONSTRAINT assessment_ml_completions_assessment_id_user_id_library_ite_key UNIQUE (assessment_id, user_id, library_item_id);


--
-- Name: assessment_ml_completions assessment_ml_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_completions
    ADD CONSTRAINT assessment_ml_completions_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: course_lessons course_lessons_course_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_course_id_lesson_id_key UNIQUE (course_id, lesson_id);


--
-- Name: course_lessons course_lessons_course_id_sequence_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_course_id_sequence_order_key UNIQUE (course_id, sequence_order);


--
-- Name: course_lessons course_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: dpo_notifications dpo_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dpo_notifications
    ADD CONSTRAINT dpo_notifications_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: learning_answers learning_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_answers
    ADD CONSTRAINT learning_answers_pkey PRIMARY KEY (id);


--
-- Name: learning_catalog learning_catalog_org_id_library_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_catalog
    ADD CONSTRAINT learning_catalog_org_id_library_item_id_key UNIQUE (org_id, library_item_id);


--
-- Name: learning_catalog learning_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_catalog
    ADD CONSTRAINT learning_catalog_pkey PRIMARY KEY (id);


--
-- Name: learning_library learning_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_library
    ADD CONSTRAINT learning_library_pkey PRIMARY KEY (id);


--
-- Name: learning_questions learning_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_questions
    ADD CONSTRAINT learning_questions_pkey PRIMARY KEY (id);


--
-- Name: lesson_attempts lesson_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_attempts
    ADD CONSTRAINT lesson_attempts_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: model_typekaart_updates model_typekaart_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_typekaart_updates
    ADD CONSTRAINT model_typekaart_updates_pkey PRIMARY KEY (id);


--
-- Name: model_typekaarten model_typekaarten_canonical_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_typekaarten
    ADD CONSTRAINT model_typekaarten_canonical_id_key UNIQUE (canonical_id);


--
-- Name: model_typekaarten model_typekaarten_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_typekaarten
    ADD CONSTRAINT model_typekaarten_pkey PRIMARY KEY (id);


--
-- Name: org_notifications org_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_notifications
    ADD CONSTRAINT org_notifications_pkey PRIMARY KEY (id);


--
-- Name: org_tool_policy org_tool_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tool_policy
    ADD CONSTRAINT org_tool_policy_pkey PRIMARY KEY (org_id, tool_code);


--
-- Name: org_tools_catalog org_tools_catalog_org_id_tool_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tools_catalog
    ADD CONSTRAINT org_tools_catalog_org_id_tool_name_key UNIQUE (org_id, tool_name);


--
-- Name: org_tools_catalog org_tools_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tools_catalog
    ADD CONSTRAINT org_tools_catalog_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_scoreboard_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_scoreboard_slug_key UNIQUE (scoreboard_slug);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: passport_identity passport_identity_org_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passport_identity
    ADD CONSTRAINT passport_identity_org_id_key UNIQUE (org_id);


--
-- Name: passport_identity passport_identity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passport_identity
    ADD CONSTRAINT passport_identity_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: ref_account_type ref_account_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_account_type
    ADD CONSTRAINT ref_account_type_pkey PRIMARY KEY (code);


--
-- Name: ref_ai_frequency ref_ai_frequency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_ai_frequency
    ADD CONSTRAINT ref_ai_frequency_pkey PRIMARY KEY (code);


--
-- Name: ref_catalog_beheerstatus ref_catalog_beheerstatus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_catalog_beheerstatus
    ADD CONSTRAINT ref_catalog_beheerstatus_pkey PRIMARY KEY (code);


--
-- Name: ref_context ref_context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_context
    ADD CONSTRAINT ref_context_pkey PRIMARY KEY (code);


--
-- Name: ref_data_type ref_data_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_data_type
    ADD CONSTRAINT ref_data_type_pkey PRIMARY KEY (code);


--
-- Name: ref_department ref_department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_department
    ADD CONSTRAINT ref_department_pkey PRIMARY KEY (code);


--
-- Name: ref_eu_ai_act_flag ref_eu_ai_act_flag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_eu_ai_act_flag
    ADD CONSTRAINT ref_eu_ai_act_flag_pkey PRIMARY KEY (code);


--
-- Name: ref_governance_flag ref_governance_flag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_governance_flag
    ADD CONSTRAINT ref_governance_flag_pkey PRIMARY KEY (code);


--
-- Name: ref_no_ai_reason ref_no_ai_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_no_ai_reason
    ADD CONSTRAINT ref_no_ai_reason_pkey PRIMARY KEY (code);


--
-- Name: ref_org_policy_status ref_org_policy_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_org_policy_status
    ADD CONSTRAINT ref_org_policy_status_pkey PRIMARY KEY (code);


--
-- Name: ref_review_trigger ref_review_trigger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_review_trigger
    ADD CONSTRAINT ref_review_trigger_pkey PRIMARY KEY (code);


--
-- Name: ref_use_case ref_use_case_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_use_case
    ADD CONSTRAINT ref_use_case_pkey PRIMARY KEY (code);


--
-- Name: rijbewijs_records rijbewijs_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rijbewijs_records
    ADD CONSTRAINT rijbewijs_records_pkey PRIMARY KEY (id);


--
-- Name: rijbewijs_records rijbewijs_records_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rijbewijs_records
    ADD CONSTRAINT rijbewijs_records_user_id_key UNIQUE (user_id);


--
-- Name: risk_result risk_result_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_result
    ADD CONSTRAINT risk_result_pkey PRIMARY KEY (survey_run_id);


--
-- Name: risk_result_tool risk_result_tool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_result_tool
    ADD CONSTRAINT risk_result_tool_pkey PRIMARY KEY (survey_run_id, survey_tool_id);


--
-- Name: scan_scoring_config scan_scoring_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_scoring_config
    ADD CONSTRAINT scan_scoring_config_pkey PRIMARY KEY (id);


--
-- Name: shadow_survey_runs shadow_survey_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_survey_runs
    ADD CONSTRAINT shadow_survey_runs_pkey PRIMARY KEY (id);


--
-- Name: survey_data_type survey_data_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_data_type
    ADD CONSTRAINT survey_data_type_pkey PRIMARY KEY (survey_run_id, data_type_code);


--
-- Name: survey_invite survey_invite_org_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_invite
    ADD CONSTRAINT survey_invite_org_id_email_key UNIQUE (org_id, email);


--
-- Name: survey_invite survey_invite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_invite
    ADD CONSTRAINT survey_invite_pkey PRIMARY KEY (id);


--
-- Name: survey_motivation survey_motivation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_motivation
    ADD CONSTRAINT survey_motivation_pkey PRIMARY KEY (survey_run_id, motivation_code);


--
-- Name: survey_participation survey_participation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_participation
    ADD CONSTRAINT survey_participation_pkey PRIMARY KEY (invite_id);


--
-- Name: survey_profile survey_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_profile
    ADD CONSTRAINT survey_profile_pkey PRIMARY KEY (survey_run_id);


--
-- Name: survey_run survey_run_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_run
    ADD CONSTRAINT survey_run_pkey PRIMARY KEY (id);


--
-- Name: survey_support_need survey_support_need_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_support_need
    ADD CONSTRAINT survey_support_need_pkey PRIMARY KEY (survey_run_id, support_need_code);


--
-- Name: survey_tool_account survey_tool_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_account
    ADD CONSTRAINT survey_tool_account_pkey PRIMARY KEY (survey_tool_id);


--
-- Name: survey_tool survey_tool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool
    ADD CONSTRAINT survey_tool_pkey PRIMARY KEY (id);


--
-- Name: survey_tool_preference_reason survey_tool_preference_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_preference_reason
    ADD CONSTRAINT survey_tool_preference_reason_pkey PRIMARY KEY (survey_run_id, preference_reason_code);


--
-- Name: survey_tool_use_case_context survey_tool_use_case_context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case_context
    ADD CONSTRAINT survey_tool_use_case_context_pkey PRIMARY KEY (survey_tool_use_case_id, context_code);


--
-- Name: survey_tool_use_case_flag survey_tool_use_case_flag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case_flag
    ADD CONSTRAINT survey_tool_use_case_flag_pkey PRIMARY KEY (survey_tool_use_case_id, governance_flag_code);


--
-- Name: survey_tool_use_case survey_tool_use_case_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case
    ADD CONSTRAINT survey_tool_use_case_pkey PRIMARY KEY (id);


--
-- Name: survey_top_concern survey_top_concern_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_top_concern
    ADD CONSTRAINT survey_top_concern_pkey PRIMARY KEY (survey_run_id, top_concern_code);


--
-- Name: survey_wave survey_wave_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_wave
    ADD CONSTRAINT survey_wave_pkey PRIMARY KEY (id);


--
-- Name: tool_catalog_discovery tool_catalog_discovery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_catalog_discovery
    ADD CONSTRAINT tool_catalog_discovery_pkey PRIMARY KEY (id);


--
-- Name: tool_discoveries tool_discoveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_discoveries
    ADD CONSTRAINT tool_discoveries_pkey PRIMARY KEY (id);


--
-- Name: _legacy_tools_catalog tools_catalog_org_id_tool_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._legacy_tools_catalog
    ADD CONSTRAINT tools_catalog_org_id_tool_id_key UNIQUE (org_id, tool_id);


--
-- Name: _legacy_tools_catalog tools_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._legacy_tools_catalog
    ADD CONSTRAINT tools_catalog_pkey PRIMARY KEY (id);


--
-- Name: tools_library tools_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tools_library
    ADD CONSTRAINT tools_library_pkey PRIMARY KEY (id);


--
-- Name: course_lessons unique_course_lesson; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT unique_course_lesson UNIQUE (course_id, lesson_id);


--
-- Name: learning_catalog unique_org_library_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_catalog
    ADD CONSTRAINT unique_org_library_item UNIQUE (org_id, library_item_id);


--
-- Name: user_course_completions unique_user_course_completion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_completions
    ADD CONSTRAINT unique_user_course_completion UNIQUE (user_id, course_id);


--
-- Name: user_course_progress unique_user_course_progress; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_progress
    ADD CONSTRAINT unique_user_course_progress UNIQUE (user_id, course_id);


--
-- Name: lesson_attempts unique_user_lesson_attempt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_attempts
    ADD CONSTRAINT unique_user_lesson_attempt UNIQUE (user_id, lesson_id, attempt_number);


--
-- Name: user_lesson_completions unique_user_lesson_completion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_completions
    ADD CONSTRAINT unique_user_lesson_completion UNIQUE (user_id, lesson_id);


--
-- Name: learning_answers unique_user_question_attempt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_answers
    ADD CONSTRAINT unique_user_question_attempt UNIQUE (user_id, question_id, attempt_number);


--
-- Name: user_roles unique_user_role; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_user_id_badge_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_badge_type_key UNIQUE (user_id, badge_type);


--
-- Name: user_course_completions user_course_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_completions
    ADD CONSTRAINT user_course_completions_pkey PRIMARY KEY (id);


--
-- Name: user_course_completions user_course_completions_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_completions
    ADD CONSTRAINT user_course_completions_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: user_course_progress user_course_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_progress
    ADD CONSTRAINT user_course_progress_pkey PRIMARY KEY (id);


--
-- Name: user_course_progress user_course_progress_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_progress
    ADD CONSTRAINT user_course_progress_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: user_lesson_completions user_lesson_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_completions
    ADD CONSTRAINT user_lesson_completions_pkey PRIMARY KEY (id);


--
-- Name: user_lesson_completions user_lesson_completions_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_completions
    ADD CONSTRAINT user_lesson_completions_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: user_lesson_progress user_lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: user_lesson_progress user_lesson_progress_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_assessments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_created_at ON public.assessments USING btree (created_at DESC);


--
-- Name: idx_assessments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_created_by ON public.assessments USING btree (created_by);


--
-- Name: idx_assessments_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_org_id ON public.assessments USING btree (org_id);


--
-- Name: idx_assessments_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_route ON public.assessments USING btree (route);


--
-- Name: idx_assessments_routing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_routing ON public.assessments USING btree (routing_method);


--
-- Name: idx_assessments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_status ON public.assessments USING btree (status);


--
-- Name: idx_audit_log_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_actor_id ON public.admin_audit_log USING btree (actor_id);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.admin_audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_org_id ON public.admin_audit_log USING btree (org_id);


--
-- Name: idx_course_lessons_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_lessons_course ON public.course_lessons USING btree (course_id);


--
-- Name: idx_course_lessons_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_lessons_order ON public.course_lessons USING btree (course_id, sequence_order);


--
-- Name: idx_courses_onboarding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_onboarding ON public.courses USING btree (required_for_onboarding);


--
-- Name: idx_courses_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_published ON public.courses USING btree (is_published);


--
-- Name: idx_dpo_notif_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dpo_notif_created ON public.dpo_notifications USING btree (created_at DESC);


--
-- Name: idx_dpo_notif_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dpo_notif_org_id ON public.dpo_notifications USING btree (org_id);


--
-- Name: idx_dpo_notif_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dpo_notif_status ON public.dpo_notifications USING btree (status);


--
-- Name: idx_incidents_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_created ON public.incidents USING btree (created_at DESC);


--
-- Name: idx_incidents_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_org ON public.incidents USING btree (org_id);


--
-- Name: idx_incidents_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidents_severity ON public.incidents USING btree (severity);


--
-- Name: idx_learning_answers_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_answers_lesson ON public.learning_answers USING btree (lesson_id);


--
-- Name: idx_learning_answers_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_answers_question ON public.learning_answers USING btree (question_id);


--
-- Name: idx_learning_answers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_answers_user ON public.learning_answers USING btree (user_id);


--
-- Name: idx_learning_catalog_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_catalog_enabled ON public.learning_catalog USING btree (is_enabled);


--
-- Name: idx_learning_catalog_is_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_catalog_is_enabled ON public.learning_catalog USING btree (is_enabled);


--
-- Name: idx_learning_catalog_library; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_catalog_library ON public.learning_catalog USING btree (library_item_id);


--
-- Name: idx_learning_catalog_library_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_catalog_library_item_id ON public.learning_catalog USING btree (library_item_id);


--
-- Name: idx_learning_catalog_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_catalog_org ON public.learning_catalog USING btree (org_id);


--
-- Name: idx_learning_catalog_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_catalog_org_id ON public.learning_catalog USING btree (org_id);


--
-- Name: idx_learning_catalog_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_catalog_priority ON public.learning_catalog USING btree (priority);


--
-- Name: idx_learning_library_content_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_library_content_type ON public.learning_library USING btree (content_type);


--
-- Name: idx_learning_library_difficulty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_library_difficulty ON public.learning_library USING btree (difficulty_level);


--
-- Name: idx_learning_library_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_library_org ON public.learning_library USING btree (org_id);


--
-- Name: idx_learning_library_required_for_license; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_library_required_for_license ON public.learning_library USING gin (required_for_license);


--
-- Name: idx_learning_library_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_library_status ON public.learning_library USING btree (status);


--
-- Name: idx_learning_questions_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_questions_lesson ON public.learning_questions USING btree (lesson_id);


--
-- Name: idx_learning_questions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_questions_order ON public.learning_questions USING btree (lesson_id, order_index);


--
-- Name: idx_learning_questions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_questions_type ON public.learning_questions USING btree (question_type);


--
-- Name: idx_lesson_attempts_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_attempts_lesson ON public.lesson_attempts USING btree (lesson_id);


--
-- Name: idx_lesson_attempts_user_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_attempts_user_lesson ON public.lesson_attempts USING btree (user_id, lesson_id);


--
-- Name: idx_lessons_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_published ON public.lessons USING btree (is_published);


--
-- Name: idx_lessons_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_type ON public.lessons USING btree (lesson_type);


--
-- Name: idx_ml_assignments_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ml_assignments_assessment ON public.assessment_ml_assignments USING btree (assessment_id);


--
-- Name: idx_ml_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ml_assignments_user ON public.assessment_ml_assignments USING btree (user_id);


--
-- Name: idx_ml_completions_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ml_completions_assessment ON public.assessment_ml_completions USING btree (assessment_id);


--
-- Name: idx_ml_completions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ml_completions_user ON public.assessment_ml_completions USING btree (user_id);


--
-- Name: idx_model_typekaarten_canonical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_model_typekaarten_canonical ON public.model_typekaarten USING btree (canonical_id);


--
-- Name: idx_model_typekaarten_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_model_typekaarten_status ON public.model_typekaarten USING btree (status);


--
-- Name: idx_org_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_notifications_created ON public.org_notifications USING btree (created_at DESC);


--
-- Name: idx_org_notifications_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_notifications_org ON public.org_notifications USING btree (org_id);


--
-- Name: idx_org_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_notifications_unread ON public.org_notifications USING btree (org_id, is_read) WHERE (is_read = false);


--
-- Name: idx_org_tools_catalog_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_tools_catalog_org_id ON public.org_tools_catalog USING btree (org_id);


--
-- Name: idx_org_tools_catalog_typekaart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_tools_catalog_typekaart ON public.org_tools_catalog USING btree (typekaart_id);


--
-- Name: idx_profiles_ai_rijbewijs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_ai_rijbewijs ON public.profiles USING btree (has_ai_rijbewijs);


--
-- Name: idx_risk_result_tool_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_result_tool_run ON public.risk_result_tool USING btree (survey_run_id);


--
-- Name: idx_risk_result_tool_tool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_result_tool_tool ON public.risk_result_tool USING btree (survey_tool_id);


--
-- Name: idx_scan_scoring_config_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_scoring_config_org ON public.scan_scoring_config USING btree (org_id);


--
-- Name: idx_scan_scoring_config_wave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_scoring_config_wave ON public.scan_scoring_config USING btree (wave_id);


--
-- Name: idx_shadow_survey_runs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shadow_survey_runs_org ON public.shadow_survey_runs USING btree (org_id);


--
-- Name: idx_shadow_survey_runs_org_dpo_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shadow_survey_runs_org_dpo_review ON public.shadow_survey_runs USING btree (org_id, dpo_review_required);


--
-- Name: idx_survey_data_type_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_survey_data_type_run ON public.survey_data_type USING btree (survey_run_id);


--
-- Name: idx_survey_motivation_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_survey_motivation_run ON public.survey_motivation USING btree (survey_run_id);


--
-- Name: idx_survey_support_need_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_survey_support_need_run ON public.survey_support_need USING btree (survey_run_id);


--
-- Name: idx_survey_tool_preference_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_survey_tool_preference_run ON public.survey_tool_preference_reason USING btree (survey_run_id);


--
-- Name: idx_survey_tool_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_survey_tool_run ON public.survey_tool USING btree (survey_run_id);


--
-- Name: idx_survey_tool_use_case_tool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_survey_tool_use_case_tool ON public.survey_tool_use_case USING btree (survey_tool_id);


--
-- Name: idx_survey_top_concern_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_survey_top_concern_run ON public.survey_top_concern USING btree (survey_run_id);


--
-- Name: idx_tool_catalog_discovery_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_catalog_discovery_org ON public.tool_catalog_discovery USING btree (org_id);


--
-- Name: idx_tool_catalog_discovery_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_catalog_discovery_status ON public.tool_catalog_discovery USING btree (review_status);


--
-- Name: idx_tool_discoveries_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_discoveries_org ON public.tool_discoveries USING btree (org_id);


--
-- Name: idx_tool_discoveries_org_risk_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_discoveries_org_risk_class ON public.tool_discoveries USING btree (org_id, application_risk_class);


--
-- Name: idx_tool_discoveries_resulting_tool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_discoveries_resulting_tool ON public.tool_discoveries USING btree (resulting_tool_id);


--
-- Name: idx_tool_discoveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tool_discoveries_status ON public.tool_discoveries USING btree (review_status);


--
-- Name: idx_tools_catalog_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_catalog_enabled ON public._legacy_tools_catalog USING btree (is_enabled);


--
-- Name: idx_tools_catalog_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_catalog_org ON public._legacy_tools_catalog USING btree (org_id);


--
-- Name: idx_tools_catalog_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_catalog_priority ON public._legacy_tools_catalog USING btree (display_priority);


--
-- Name: idx_tools_catalog_tool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_catalog_tool ON public._legacy_tools_catalog USING btree (tool_id);


--
-- Name: idx_tools_library_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_library_category ON public.tools_library USING btree (category);


--
-- Name: idx_tools_library_gpai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_library_gpai ON public.tools_library USING btree (gpai_status);


--
-- Name: idx_tools_library_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_library_org ON public.tools_library USING btree (org_id);


--
-- Name: idx_tools_library_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_library_status ON public.tools_library USING btree (status);


--
-- Name: idx_tools_library_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tools_library_vendor ON public.tools_library USING btree (vendor);


--
-- Name: idx_user_badges_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_org_id ON public.user_badges USING btree (org_id);


--
-- Name: idx_user_badges_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_badges_user_id ON public.user_badges USING btree (user_id);


--
-- Name: idx_user_course_completions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_course_completions_user ON public.user_course_completions USING btree (user_id);


--
-- Name: idx_user_course_progress_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_course_progress_user ON public.user_course_progress USING btree (user_id);


--
-- Name: idx_user_lesson_completions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_lesson_completions_user ON public.user_lesson_completions USING btree (user_id);


--
-- Name: idx_user_lesson_progress_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_lesson_progress_lesson ON public.user_lesson_progress USING btree (lesson_id);


--
-- Name: idx_user_lesson_progress_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_lesson_progress_user ON public.user_lesson_progress USING btree (user_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: assessments assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles enforce_org_admin_limit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_org_admin_limit BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.check_org_admin_limit();


--
-- Name: passport_identity passport_identity_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER passport_identity_updated_at BEFORE UPDATE ON public.passport_identity FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lesson_attempts protect_lesson_attempt_scores_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protect_lesson_attempt_scores_trigger BEFORE UPDATE ON public.lesson_attempts FOR EACH ROW EXECUTE FUNCTION public.protect_lesson_attempt_scores();


--
-- Name: profiles protect_rijbewijs_fields_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protect_rijbewijs_fields_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_rijbewijs_fields();


--
-- Name: lesson_attempts sanitize_lesson_attempt_insert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sanitize_lesson_attempt_insert_trigger BEFORE INSERT ON public.lesson_attempts FOR EACH ROW EXECUTE FUNCTION public.sanitize_lesson_attempt_insert();


--
-- Name: assessments trg_assign_microlearning_on_orange; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assign_microlearning_on_orange AFTER INSERT ON public.assessments FOR EACH ROW WHEN ((new.route = 'orange'::public.assessment_route)) EXECUTE FUNCTION public.assign_microlearning_on_orange_assessment();


--
-- Name: profiles trg_audit_profile_active; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_profile_active AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_log_profile_active();


--
-- Name: user_roles trg_audit_user_roles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_log_user_roles();


--
-- Name: dpo_notifications trg_check_activation_after_dpo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_activation_after_dpo AFTER UPDATE ON public.dpo_notifications FOR EACH ROW EXECUTE FUNCTION public.check_activation_after_dpo_action();


--
-- Name: assessment_ml_completions trg_check_activation_after_ml; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_activation_after_ml AFTER INSERT ON public.assessment_ml_completions FOR EACH ROW EXECUTE FUNCTION public.check_activation_after_ml_completion();


--
-- Name: incidents trg_notify_dpo_on_incident; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_dpo_on_incident AFTER INSERT ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.notify_dpo_on_incident();


--
-- Name: assessments trg_notify_dpo_on_orange; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_dpo_on_orange AFTER INSERT ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.notify_dpo_on_orange_assessment();


--
-- Name: assessments trg_notify_dpo_on_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_dpo_on_status_change AFTER UPDATE ON public.assessments FOR EACH ROW WHEN (((new.status = 'pending_review'::public.assessment_status) AND (old.status IS DISTINCT FROM 'pending_review'::public.assessment_status))) EXECUTE FUNCTION public.notify_dpo_on_assessment_status_change();


--
-- Name: survey_run trg_protect_survey_run_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_protect_survey_run_immutable BEFORE UPDATE ON public.survey_run FOR EACH ROW EXECUTE FUNCTION public.protect_survey_run_immutable_fields();


--
-- Name: user_badges trg_validate_badge_type; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_badge_type BEFORE INSERT OR UPDATE ON public.user_badges FOR EACH ROW EXECUTE FUNCTION public.validate_badge_type();


--
-- Name: model_typekaart_updates trg_validate_model_typekaart_updates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_model_typekaart_updates BEFORE INSERT OR UPDATE ON public.model_typekaart_updates FOR EACH ROW EXECUTE FUNCTION public.validate_model_typekaart_updates();


--
-- Name: model_typekaarten trg_validate_model_typekaarten; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_model_typekaarten BEFORE INSERT OR UPDATE ON public.model_typekaarten FOR EACH ROW EXECUTE FUNCTION public.validate_model_typekaarten();


--
-- Name: org_tools_catalog trg_validate_org_tools_catalog_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_org_tools_catalog_status BEFORE INSERT OR UPDATE ON public.org_tools_catalog FOR EACH ROW EXECUTE FUNCTION public.validate_org_tools_catalog_status();


--
-- Name: tool_discoveries trg_validate_tool_discovery_risk_class; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_tool_discovery_risk_class BEFORE INSERT OR UPDATE ON public.tool_discoveries FOR EACH ROW EXECUTE FUNCTION public.validate_tool_discovery_risk_class();


--
-- Name: lesson_attempts trigger_rijbewijs_on_exam_pass; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_rijbewijs_on_exam_pass AFTER INSERT OR UPDATE ON public.lesson_attempts FOR EACH ROW EXECUTE FUNCTION public.grant_rijbewijs_on_exam_pass();


--
-- Name: organizations trigger_validate_plan_type; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_plan_type BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.validate_plan_type();


--
-- Name: shadow_survey_runs trigger_validate_shadow_survey_runs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_shadow_survey_runs BEFORE INSERT OR UPDATE ON public.shadow_survey_runs FOR EACH ROW EXECUTE FUNCTION public.validate_shadow_survey_runs();


--
-- Name: courses update_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learning_catalog update_learning_catalog_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learning_catalog_updated_at BEFORE UPDATE ON public.learning_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learning_library update_learning_library_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learning_library_updated_at BEFORE UPDATE ON public.learning_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learning_questions update_learning_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learning_questions_updated_at BEFORE UPDATE ON public.learning_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lessons update_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _legacy_tools_catalog update_tools_catalog_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tools_catalog_updated_at BEFORE UPDATE ON public._legacy_tools_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tools_library update_tools_library_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tools_library_updated_at BEFORE UPDATE ON public.tools_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_course_progress update_user_course_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_course_progress_updated_at BEFORE UPDATE ON public.user_course_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_lesson_progress update_user_lesson_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_lesson_progress_updated_at BEFORE UPDATE ON public.user_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: archetype_ml_map archetype_ml_map_library_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archetype_ml_map
    ADD CONSTRAINT archetype_ml_map_library_item_id_fkey FOREIGN KEY (library_item_id) REFERENCES public.learning_library(id) ON DELETE CASCADE;


--
-- Name: assessment_ml_assignments assessment_ml_assignments_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_assignments
    ADD CONSTRAINT assessment_ml_assignments_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_ml_assignments assessment_ml_assignments_library_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_assignments
    ADD CONSTRAINT assessment_ml_assignments_library_item_id_fkey FOREIGN KEY (library_item_id) REFERENCES public.learning_library(id);


--
-- Name: assessment_ml_assignments assessment_ml_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_assignments
    ADD CONSTRAINT assessment_ml_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: assessment_ml_completions assessment_ml_completions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_completions
    ADD CONSTRAINT assessment_ml_completions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_ml_completions assessment_ml_completions_library_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_completions
    ADD CONSTRAINT assessment_ml_completions_library_item_id_fkey FOREIGN KEY (library_item_id) REFERENCES public.learning_library(id);


--
-- Name: assessment_ml_completions assessment_ml_completions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_ml_completions
    ADD CONSTRAINT assessment_ml_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: assessments assessments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: assessments assessments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: assessments assessments_reviewer_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_reviewer_admin_id_fkey FOREIGN KEY (reviewer_admin_id) REFERENCES public.profiles(id);


--
-- Name: course_lessons course_lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_lessons course_lessons_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: courses courses_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: dpo_notifications dpo_notifications_actioned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dpo_notifications
    ADD CONSTRAINT dpo_notifications_actioned_by_fkey FOREIGN KEY (actioned_by) REFERENCES public.profiles(id);


--
-- Name: dpo_notifications dpo_notifications_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dpo_notifications
    ADD CONSTRAINT dpo_notifications_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: dpo_notifications dpo_notifications_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dpo_notifications
    ADD CONSTRAINT dpo_notifications_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: incidents incidents_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: incidents incidents_dpo_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_dpo_reviewed_by_fkey FOREIGN KEY (dpo_reviewed_by) REFERENCES public.profiles(id);


--
-- Name: incidents incidents_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: incidents incidents_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.profiles(id);


--
-- Name: learning_answers learning_answers_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_answers
    ADD CONSTRAINT learning_answers_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: learning_answers learning_answers_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_answers
    ADD CONSTRAINT learning_answers_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: learning_answers learning_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_answers
    ADD CONSTRAINT learning_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.learning_questions(id) ON DELETE CASCADE;


--
-- Name: learning_answers learning_answers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_answers
    ADD CONSTRAINT learning_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: learning_catalog learning_catalog_library_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_catalog
    ADD CONSTRAINT learning_catalog_library_item_id_fkey FOREIGN KEY (library_item_id) REFERENCES public.learning_library(id) ON DELETE CASCADE;


--
-- Name: learning_catalog learning_catalog_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_catalog
    ADD CONSTRAINT learning_catalog_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: learning_library learning_library_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_library
    ADD CONSTRAINT learning_library_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: learning_library learning_library_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_library
    ADD CONSTRAINT learning_library_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL;


--
-- Name: learning_library learning_library_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_library
    ADD CONSTRAINT learning_library_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: learning_questions learning_questions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_questions
    ADD CONSTRAINT learning_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: learning_questions learning_questions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_questions
    ADD CONSTRAINT learning_questions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: learning_questions learning_questions_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_questions
    ADD CONSTRAINT learning_questions_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: lesson_attempts lesson_attempts_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_attempts
    ADD CONSTRAINT lesson_attempts_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_attempts lesson_attempts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_attempts
    ADD CONSTRAINT lesson_attempts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: lessons lessons_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: lessons lessons_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: model_typekaart_updates model_typekaart_updates_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_typekaart_updates
    ADD CONSTRAINT model_typekaart_updates_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: model_typekaart_updates model_typekaart_updates_typekaart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_typekaart_updates
    ADD CONSTRAINT model_typekaart_updates_typekaart_id_fkey FOREIGN KEY (typekaart_id) REFERENCES public.model_typekaarten(id);


--
-- Name: model_typekaarten model_typekaarten_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_typekaarten
    ADD CONSTRAINT model_typekaarten_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: org_notifications org_notifications_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_notifications
    ADD CONSTRAINT org_notifications_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_notifications org_notifications_read_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_notifications
    ADD CONSTRAINT org_notifications_read_by_fkey FOREIGN KEY (read_by) REFERENCES public.profiles(id);


--
-- Name: org_tool_policy org_tool_policy_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tool_policy
    ADD CONSTRAINT org_tool_policy_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_tools_catalog org_tools_catalog_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tools_catalog
    ADD CONSTRAINT org_tools_catalog_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_tools_catalog org_tools_catalog_override_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tools_catalog
    ADD CONSTRAINT org_tools_catalog_override_acknowledged_by_fkey FOREIGN KEY (override_acknowledged_by) REFERENCES public.profiles(id);


--
-- Name: passport_identity passport_identity_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passport_identity
    ADD CONSTRAINT passport_identity_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: rijbewijs_records rijbewijs_records_lesson_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rijbewijs_records
    ADD CONSTRAINT rijbewijs_records_lesson_attempt_id_fkey FOREIGN KEY (lesson_attempt_id) REFERENCES public.lesson_attempts(id);


--
-- Name: rijbewijs_records rijbewijs_records_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rijbewijs_records
    ADD CONSTRAINT rijbewijs_records_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: rijbewijs_records rijbewijs_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rijbewijs_records
    ADD CONSTRAINT rijbewijs_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: risk_result risk_result_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_result
    ADD CONSTRAINT risk_result_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: risk_result_tool risk_result_tool_scoring_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_result_tool
    ADD CONSTRAINT risk_result_tool_scoring_config_id_fkey FOREIGN KEY (scoring_config_id) REFERENCES public.scan_scoring_config(id);


--
-- Name: risk_result_tool risk_result_tool_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_result_tool
    ADD CONSTRAINT risk_result_tool_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: risk_result_tool risk_result_tool_survey_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_result_tool
    ADD CONSTRAINT risk_result_tool_survey_tool_id_fkey FOREIGN KEY (survey_tool_id) REFERENCES public.survey_tool(id) ON DELETE CASCADE;


--
-- Name: scan_scoring_config scan_scoring_config_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_scoring_config
    ADD CONSTRAINT scan_scoring_config_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: scan_scoring_config scan_scoring_config_wave_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_scoring_config
    ADD CONSTRAINT scan_scoring_config_wave_id_fkey FOREIGN KEY (wave_id) REFERENCES public.survey_wave(id);


--
-- Name: shadow_survey_runs shadow_survey_runs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_survey_runs
    ADD CONSTRAINT shadow_survey_runs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: shadow_survey_runs shadow_survey_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_survey_runs
    ADD CONSTRAINT shadow_survey_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: survey_data_type survey_data_type_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_data_type
    ADD CONSTRAINT survey_data_type_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: survey_invite survey_invite_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_invite
    ADD CONSTRAINT survey_invite_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: survey_invite survey_invite_wave_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_invite
    ADD CONSTRAINT survey_invite_wave_id_fkey FOREIGN KEY (wave_id) REFERENCES public.survey_wave(id);


--
-- Name: survey_motivation survey_motivation_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_motivation
    ADD CONSTRAINT survey_motivation_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: survey_participation survey_participation_invite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_participation
    ADD CONSTRAINT survey_participation_invite_id_fkey FOREIGN KEY (invite_id) REFERENCES public.survey_invite(id);


--
-- Name: survey_participation survey_participation_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_participation
    ADD CONSTRAINT survey_participation_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id);


--
-- Name: survey_profile survey_profile_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_profile
    ADD CONSTRAINT survey_profile_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: survey_run survey_run_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_run
    ADD CONSTRAINT survey_run_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: survey_run survey_run_wave_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_run
    ADD CONSTRAINT survey_run_wave_id_fkey FOREIGN KEY (wave_id) REFERENCES public.survey_wave(id);


--
-- Name: survey_support_need survey_support_need_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_support_need
    ADD CONSTRAINT survey_support_need_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: survey_tool_account survey_tool_account_survey_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_account
    ADD CONSTRAINT survey_tool_account_survey_tool_id_fkey FOREIGN KEY (survey_tool_id) REFERENCES public.survey_tool(id) ON DELETE CASCADE;


--
-- Name: survey_tool_preference_reason survey_tool_preference_reason_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_preference_reason
    ADD CONSTRAINT survey_tool_preference_reason_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: survey_tool survey_tool_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool
    ADD CONSTRAINT survey_tool_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: survey_tool_use_case_context survey_tool_use_case_context_context_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case_context
    ADD CONSTRAINT survey_tool_use_case_context_context_code_fkey FOREIGN KEY (context_code) REFERENCES public.ref_context(code);


--
-- Name: survey_tool_use_case_context survey_tool_use_case_context_survey_tool_use_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case_context
    ADD CONSTRAINT survey_tool_use_case_context_survey_tool_use_case_id_fkey FOREIGN KEY (survey_tool_use_case_id) REFERENCES public.survey_tool_use_case(id) ON DELETE CASCADE;


--
-- Name: survey_tool_use_case_flag survey_tool_use_case_flag_governance_flag_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case_flag
    ADD CONSTRAINT survey_tool_use_case_flag_governance_flag_code_fkey FOREIGN KEY (governance_flag_code) REFERENCES public.ref_governance_flag(code);


--
-- Name: survey_tool_use_case_flag survey_tool_use_case_flag_survey_tool_use_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case_flag
    ADD CONSTRAINT survey_tool_use_case_flag_survey_tool_use_case_id_fkey FOREIGN KEY (survey_tool_use_case_id) REFERENCES public.survey_tool_use_case(id) ON DELETE CASCADE;


--
-- Name: survey_tool_use_case survey_tool_use_case_survey_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case
    ADD CONSTRAINT survey_tool_use_case_survey_tool_id_fkey FOREIGN KEY (survey_tool_id) REFERENCES public.survey_tool(id) ON DELETE CASCADE;


--
-- Name: survey_tool_use_case survey_tool_use_case_use_case_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_tool_use_case
    ADD CONSTRAINT survey_tool_use_case_use_case_code_fkey FOREIGN KEY (use_case_code) REFERENCES public.ref_use_case(code);


--
-- Name: survey_top_concern survey_top_concern_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_top_concern
    ADD CONSTRAINT survey_top_concern_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id) ON DELETE CASCADE;


--
-- Name: survey_wave survey_wave_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_wave
    ADD CONSTRAINT survey_wave_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tool_catalog_discovery tool_catalog_discovery_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_catalog_discovery
    ADD CONSTRAINT tool_catalog_discovery_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tool_catalog_discovery tool_catalog_discovery_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_catalog_discovery
    ADD CONSTRAINT tool_catalog_discovery_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.survey_run(id);


--
-- Name: tool_catalog_discovery tool_catalog_discovery_survey_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_catalog_discovery
    ADD CONSTRAINT tool_catalog_discovery_survey_tool_id_fkey FOREIGN KEY (survey_tool_id) REFERENCES public.survey_tool(id);


--
-- Name: tool_discoveries tool_discoveries_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_discoveries
    ADD CONSTRAINT tool_discoveries_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tool_discoveries tool_discoveries_resulting_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_discoveries
    ADD CONSTRAINT tool_discoveries_resulting_tool_id_fkey FOREIGN KEY (resulting_tool_id) REFERENCES public.tools_library(id);


--
-- Name: tool_discoveries tool_discoveries_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_discoveries
    ADD CONSTRAINT tool_discoveries_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: tool_discoveries tool_discoveries_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_discoveries
    ADD CONSTRAINT tool_discoveries_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: tool_discoveries tool_discoveries_survey_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_discoveries
    ADD CONSTRAINT tool_discoveries_survey_run_id_fkey FOREIGN KEY (survey_run_id) REFERENCES public.shadow_survey_runs(id) ON DELETE SET NULL;


--
-- Name: _legacy_tools_catalog tools_catalog_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._legacy_tools_catalog
    ADD CONSTRAINT tools_catalog_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: _legacy_tools_catalog tools_catalog_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._legacy_tools_catalog
    ADD CONSTRAINT tools_catalog_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.tools_library(id) ON DELETE CASCADE;


--
-- Name: tools_library tools_library_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tools_library
    ADD CONSTRAINT tools_library_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: tools_library tools_library_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tools_library
    ADD CONSTRAINT tools_library_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: user_badges user_badges_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_course_completions user_course_completions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_completions
    ADD CONSTRAINT user_course_completions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: user_course_completions user_course_completions_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_completions
    ADD CONSTRAINT user_course_completions_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: user_course_completions user_course_completions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_completions
    ADD CONSTRAINT user_course_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_course_progress user_course_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_progress
    ADD CONSTRAINT user_course_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: user_course_progress user_course_progress_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_progress
    ADD CONSTRAINT user_course_progress_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: user_course_progress user_course_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_course_progress
    ADD CONSTRAINT user_course_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_lesson_completions user_lesson_completions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_completions
    ADD CONSTRAINT user_lesson_completions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: user_lesson_completions user_lesson_completions_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_completions
    ADD CONSTRAINT user_lesson_completions_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: user_lesson_completions user_lesson_completions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_completions
    ADD CONSTRAINT user_lesson_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_lesson_progress user_lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: user_lesson_progress user_lesson_progress_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: user_lesson_progress user_lesson_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: course_lessons Admins and content editors manage course_lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and content editors manage course_lessons" ON public.course_lessons USING ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid()) OR public.has_role(auth.uid(), 'org_admin'::public.app_role))) WITH CHECK ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid()) OR public.has_role(auth.uid(), 'org_admin'::public.app_role)));


--
-- Name: courses Admins and content editors manage courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and content editors manage courses" ON public.courses USING ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: lessons Admins and content editors manage lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and content editors manage lessons" ON public.lessons USING ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: learning_questions Admins and editors can view all questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and editors can view all questions" ON public.learning_questions FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid()) OR public.is_org_admin(auth.uid())));


--
-- Name: learning_answers Admins can manage answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage answers" ON public.learning_answers USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: rijbewijs_records Admins can view all rijbewijs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all rijbewijs" ON public.rijbewijs_records FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: tool_discoveries Admins manage org-scoped tool discoveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage org-scoped tool discoveries" ON public.tool_discoveries USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: learning_library Content editors manage library content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Content editors manage library content" ON public.learning_library USING (public.is_content_editor(auth.uid())) WITH CHECK (public.is_content_editor(auth.uid()));


--
-- Name: learning_catalog Managers manage own org catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers manage own org catalog" ON public.learning_catalog USING ((public.is_manager(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid())))) WITH CHECK ((public.is_manager(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: learning_library Managers view published library content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers view published library content" ON public.learning_library FOR SELECT USING (((status = 'published'::public.learning_status) AND public.is_manager(auth.uid())));


--
-- Name: user_course_completions Org admins and super admins manage course completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins and super admins manage course completions" ON public.user_course_completions USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: user_course_progress Org admins and super admins manage course progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins and super admins manage course progress" ON public.user_course_progress USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: lesson_attempts Org admins and super admins manage lesson attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins and super admins manage lesson attempts" ON public.lesson_attempts USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: user_lesson_completions Org admins and super admins manage lesson completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins and super admins manage lesson completions" ON public.user_lesson_completions USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: user_lesson_progress Org admins and super admins manage lesson progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins and super admins manage lesson progress" ON public.user_lesson_progress USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: organizations Org admins and super admins manage organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins and super admins manage organizations" ON public.organizations USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (id = public.get_user_org_id(auth.uid())))));


--
-- Name: profiles Org admins and super admins manage profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins and super admins manage profiles" ON public.profiles USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: user_roles Org admins and super admins manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins and super admins manage roles" ON public.user_roles TO authenticated USING ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: learning_questions Org admins can manage org questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can manage org questions" ON public.learning_questions USING ((public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid())))) WITH CHECK ((public.has_role(auth.uid(), 'org_admin'::public.app_role) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: _legacy_tools_catalog Org admins manage own catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins manage own catalog" ON public._legacy_tools_catalog USING (((public.is_org_admin(auth.uid()) OR public.is_manager(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid())))) WITH CHECK (((public.is_org_admin(auth.uid()) OR public.is_manager(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: learning_catalog Org admins manage own org catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins manage own org catalog" ON public.learning_catalog USING ((public.is_org_admin(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid())))) WITH CHECK ((public.is_org_admin(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: user_badges Org admins view org badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins view org badges" ON public.user_badges FOR SELECT USING (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid()))));


--
-- Name: learning_library Org admins view published library content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins view published library content" ON public.learning_library FOR SELECT USING (((status = 'published'::public.learning_status) AND public.is_org_admin(auth.uid())));


--
-- Name: tools_library Org admins view published tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins view published tools" ON public.tools_library FOR SELECT USING (((status = 'published'::text) AND ((org_id IS NULL) OR (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: learning_questions Super admins and content editors can manage questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins and content editors can manage questions" ON public.learning_questions USING ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid()))) WITH CHECK ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid())));


--
-- Name: learning_questions Super admins and content editors can view all questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins and content editors can view all questions" ON public.learning_questions FOR SELECT USING ((public.is_super_admin(auth.uid()) OR public.is_content_editor(auth.uid())));


--
-- Name: _legacy_tools_catalog Super admins manage all catalogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins manage all catalogs" ON public._legacy_tools_catalog USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: learning_catalog Super admins manage all catalogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins manage all catalogs" ON public.learning_catalog USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: learning_library Super admins manage all library content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins manage all library content" ON public.learning_library USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: tools_library Super admins manage all tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins manage all tools" ON public.tools_library USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: shadow_survey_runs Users can insert own survey runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own survey runs" ON public.shadow_survey_runs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tool_discoveries Users can insert own tool discoveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own tool discoveries" ON public.tool_discoveries FOR INSERT WITH CHECK ((auth.uid() = submitted_by));


--
-- Name: learning_answers Users can insert their own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own answers" ON public.learning_answers FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_course_completions Users can insert their own course completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own course completions" ON public.user_course_completions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_course_progress Users can insert their own course progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own course progress" ON public.user_course_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_attempts Users can insert their own lesson attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own lesson attempts" ON public.lesson_attempts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_lesson_completions Users can insert their own lesson completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own lesson completions" ON public.user_lesson_completions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: shadow_survey_runs Users can update own survey runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own survey runs" ON public.shadow_survey_runs FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: learning_answers Users can update their own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own answers" ON public.learning_answers FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: user_course_progress Users can update their own course progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own course progress" ON public.user_course_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: lesson_attempts Users can update their own lesson attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own lesson attempts" ON public.lesson_attempts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_lesson_completions Users can update their own lesson completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own lesson completions" ON public.user_lesson_completions FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile (limited); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile (limited)" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK (((auth.uid() = id) AND (has_ai_rijbewijs = ( SELECT profiles_1.has_ai_rijbewijs
   FROM public.profiles profiles_1
  WHERE (profiles_1.id = auth.uid())))));


--
-- Name: course_lessons Users can view course_lessons for published courses in their or; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view course_lessons for published courses in their or" ON public.course_lessons FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = course_lessons.course_id) AND (courses.is_published = true) AND (courses.org_id = public.get_user_org_id(auth.uid()))))));


--
-- Name: user_badges Users can view own badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: organizations Users can view own org or super admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own org or super admin all" ON public.organizations FOR SELECT USING ((public.is_super_admin(auth.uid()) OR (id = public.get_user_org_id(auth.uid()))));


--
-- Name: rijbewijs_records Users can view own rijbewijs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own rijbewijs" ON public.rijbewijs_records FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: shadow_survey_runs Users can view own survey runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own survey runs" ON public.shadow_survey_runs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tool_discoveries Users can view own tool discoveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tool discoveries" ON public.tool_discoveries FOR SELECT USING ((auth.uid() = submitted_by));


--
-- Name: courses Users can view published courses in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view published courses in their org" ON public.courses FOR SELECT USING (((is_published = true) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: lessons Users can view published lessons in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view published lessons in their org" ON public.lessons FOR SELECT USING (((is_published = true) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: learning_answers Users can view their own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own answers" ON public.learning_answers FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_course_completions Users can view their own course completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own course completions" ON public.user_course_completions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_course_progress Users can view their own course progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own course progress" ON public.user_course_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: lesson_attempts Users can view their own lesson attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own lesson attempts" ON public.lesson_attempts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_lesson_completions Users can view their own lesson completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own lesson completions" ON public.user_lesson_completions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_lesson_progress Users manage own lesson progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own lesson progress" ON public.user_lesson_progress TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: learning_catalog Users view enabled catalog items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view enabled catalog items" ON public.learning_catalog FOR SELECT USING (((is_enabled = true) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: _legacy_tools_catalog Users view enabled tools in own org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view enabled tools in own org" ON public._legacy_tools_catalog FOR SELECT USING (((is_enabled = true) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: learning_library Users view published library content via catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view published library content via catalog" ON public.learning_library FOR SELECT USING (((status = 'published'::public.learning_status) AND ((org_id IS NULL) OR (org_id = public.get_user_org_id(auth.uid())) OR (EXISTS ( SELECT 1
   FROM public.learning_catalog lc
  WHERE ((lc.library_item_id = learning_library.id) AND (lc.org_id = public.get_user_org_id(auth.uid())) AND (lc.is_enabled = true)))))));


--
-- Name: tools_library Users view published platform tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view published platform tools" ON public.tools_library FOR SELECT USING (((status = 'published'::text) AND ((org_id IS NULL) OR (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: _legacy_tools_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._legacy_tools_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: scan_scoring_config admin_delete_scan_scoring_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_scan_scoring_config ON public.scan_scoring_config FOR DELETE TO authenticated USING ((public.is_super_admin(auth.uid()) OR ((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))));


--
-- Name: admin_audit_log admin_insert_audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_audit_log ON public.admin_audit_log FOR INSERT TO authenticated WITH CHECK ((public.is_super_admin(auth.uid()) OR public.is_org_admin(auth.uid())));


--
-- Name: scan_scoring_config admin_insert_scan_scoring_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_scan_scoring_config ON public.scan_scoring_config FOR INSERT TO authenticated WITH CHECK ((public.is_super_admin(auth.uid()) OR ((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))));


--
-- Name: admin_audit_log admin_select_audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_audit_log ON public.admin_audit_log FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (public.is_org_admin(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: risk_result admin_select_risk_result; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_risk_result ON public.risk_result FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = risk_result.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: risk_result_tool admin_select_risk_result_tool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_risk_result_tool ON public.risk_result_tool FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = risk_result_tool.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_data_type admin_select_survey_data_type; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_data_type ON public.survey_data_type FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = survey_data_type.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_motivation admin_select_survey_motivation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_motivation ON public.survey_motivation FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = survey_motivation.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_profile admin_select_survey_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_profile ON public.survey_profile FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = survey_profile.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_support_need admin_select_survey_support_need; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_support_need ON public.survey_support_need FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = survey_support_need.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_tool admin_select_survey_tool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_tool ON public.survey_tool FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = survey_tool.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_tool_account admin_select_survey_tool_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_tool_account ON public.survey_tool_account FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.survey_tool st
     JOIN public.survey_run sr ON ((sr.id = st.survey_run_id)))
  WHERE ((st.id = survey_tool_account.survey_tool_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_tool_preference_reason admin_select_survey_tool_preference_reason; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_tool_preference_reason ON public.survey_tool_preference_reason FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = survey_tool_preference_reason.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_tool_use_case admin_select_survey_tool_use_case; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_tool_use_case ON public.survey_tool_use_case FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.survey_tool st
     JOIN public.survey_run sr ON ((sr.id = st.survey_run_id)))
  WHERE ((st.id = survey_tool_use_case.survey_tool_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_tool_use_case_context admin_select_survey_tool_use_case_context; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_tool_use_case_context ON public.survey_tool_use_case_context FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM ((public.survey_tool_use_case stuc
     JOIN public.survey_tool st ON ((st.id = stuc.survey_tool_id)))
     JOIN public.survey_run sr ON ((sr.id = st.survey_run_id)))
  WHERE ((stuc.id = survey_tool_use_case_context.survey_tool_use_case_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_tool_use_case_flag admin_select_survey_tool_use_case_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_tool_use_case_flag ON public.survey_tool_use_case_flag FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM ((public.survey_tool_use_case stuc
     JOIN public.survey_tool st ON ((st.id = stuc.survey_tool_id)))
     JOIN public.survey_run sr ON ((sr.id = st.survey_run_id)))
  WHERE ((stuc.id = survey_tool_use_case_flag.survey_tool_use_case_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: survey_top_concern admin_select_survey_top_concern; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_survey_top_concern ON public.survey_top_concern FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = survey_top_concern.survey_run_id) AND (sr.org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))))));


--
-- Name: tool_catalog_discovery admin_select_tool_catalog_discovery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_select_tool_catalog_discovery ON public.tool_catalog_discovery FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR ((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))));


--
-- Name: scan_scoring_config admin_update_scan_scoring_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_scan_scoring_config ON public.scan_scoring_config FOR UPDATE TO authenticated USING ((public.is_super_admin(auth.uid()) OR ((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR ((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))));


--
-- Name: tool_catalog_discovery admin_update_tool_catalog_discovery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_tool_catalog_discovery ON public.tool_catalog_discovery FOR UPDATE TO authenticated USING ((public.is_super_admin(auth.uid()) OR ((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR ((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())))));


--
-- Name: survey_run anon_complete_survey_run; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_complete_survey_run ON public.survey_run FOR UPDATE TO anon USING (true) WITH CHECK ((org_id IS NOT NULL));


--
-- Name: survey_tool_preference_reason anon_delete_active_pref_reason; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_delete_active_pref_reason ON public.survey_tool_preference_reason FOR DELETE TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.survey_run sr
  WHERE ((sr.id = survey_tool_preference_reason.survey_run_id) AND (sr.completed_at IS NULL)))));


--
-- Name: survey_data_type anon_insert_survey_data_type; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_data_type ON public.survey_data_type FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_motivation anon_insert_survey_motivation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_motivation ON public.survey_motivation FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_participation anon_insert_survey_participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_participation ON public.survey_participation FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_profile anon_insert_survey_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_profile ON public.survey_profile FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_run anon_insert_survey_run; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_run ON public.survey_run FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_support_need anon_insert_survey_support_need; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_support_need ON public.survey_support_need FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_tool anon_insert_survey_tool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_tool ON public.survey_tool FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_tool_account anon_insert_survey_tool_account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_tool_account ON public.survey_tool_account FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_tool_preference_reason anon_insert_survey_tool_preference_reason; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_tool_preference_reason ON public.survey_tool_preference_reason FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_tool_use_case anon_insert_survey_tool_use_case; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_tool_use_case ON public.survey_tool_use_case FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_tool_use_case_context anon_insert_survey_tool_use_case_context; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_tool_use_case_context ON public.survey_tool_use_case_context FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_tool_use_case_flag anon_insert_survey_tool_use_case_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_tool_use_case_flag ON public.survey_tool_use_case_flag FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: survey_top_concern anon_insert_survey_top_concern; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_survey_top_concern ON public.survey_top_concern FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: tool_catalog_discovery anon_insert_tool_catalog_discovery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_insert_tool_catalog_discovery ON public.tool_catalog_discovery FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: org_tool_policy anon_read_org_tool_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_read_org_tool_policy ON public.org_tool_policy FOR SELECT TO authenticated, anon USING (true);


--
-- Name: tools_library anon_read_published_platform_tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_read_published_platform_tools ON public.tools_library FOR SELECT TO authenticated, anon USING (((status = 'published'::text) AND (org_id IS NULL)));


--
-- Name: survey_participation anon_update_survey_participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_update_survey_participation ON public.survey_participation FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: survey_profile anon_update_survey_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_update_survey_profile ON public.survey_profile FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: archetype_ml_map; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.archetype_ml_map ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_ml_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_ml_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_ml_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_ml_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_run auth_complete_survey_run; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_complete_survey_run ON public.survey_run FOR UPDATE TO authenticated USING (true) WITH CHECK ((org_id IS NOT NULL));


--
-- Name: archetype_ml_map authenticated_read_active_archetype_ml_map; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_active_archetype_ml_map ON public.archetype_ml_map FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: model_typekaarten authenticated_read_published_model_typekaarten; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_published_model_typekaarten ON public.model_typekaarten FOR SELECT TO authenticated USING ((status = 'published'::text));


--
-- Name: scan_scoring_config authenticated_select_scan_scoring_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_select_scan_scoring_config ON public.scan_scoring_config FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: archetype_ml_map content_editor_manage_archetype_ml_map; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_editor_manage_archetype_ml_map ON public.archetype_ml_map TO authenticated USING (public.is_content_editor(auth.uid())) WITH CHECK (public.is_content_editor(auth.uid()));


--
-- Name: course_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: org_tools_catalog dpo_manage_org_tools_catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_manage_org_tools_catalog ON public.org_tools_catalog TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role))))) WITH CHECK ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: dpo_notifications dpo_manage_own_org_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_manage_own_org_notifications ON public.dpo_notifications TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role))))) WITH CHECK ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: tool_discoveries dpo_manage_own_org_tool_discoveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_manage_own_org_tool_discoveries ON public.tool_discoveries TO authenticated USING ((public.is_dpo(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid())))) WITH CHECK ((public.is_dpo(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: dpo_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dpo_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments dpo_read_org_assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_read_org_assessments ON public.assessments FOR SELECT TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: organizations dpo_read_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_read_own_org ON public.organizations FOR SELECT TO authenticated USING ((id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: user_badges dpo_read_own_org_badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_read_own_org_badges ON public.user_badges FOR SELECT TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: passport_identity dpo_read_own_org_passport_identity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_read_own_org_passport_identity ON public.passport_identity FOR SELECT TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: profiles dpo_read_own_org_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_read_own_org_profiles ON public.profiles FOR SELECT TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: shadow_survey_runs dpo_read_own_org_survey_runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_read_own_org_survey_runs ON public.shadow_survey_runs FOR SELECT TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: tool_discoveries dpo_read_own_org_tool_discoveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_read_own_org_tool_discoveries ON public.tool_discoveries FOR SELECT TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: org_tool_policy dpo_select_org_tool_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_select_org_tool_policy ON public.org_tool_policy FOR SELECT TO authenticated USING ((public.is_dpo(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: org_tool_policy dpo_update_org_tool_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_update_org_tool_policy ON public.org_tool_policy FOR UPDATE TO authenticated USING ((public.is_dpo(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid())))) WITH CHECK ((public.is_dpo(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: organizations dpo_update_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_update_own_org ON public.organizations FOR UPDATE TO authenticated USING ((id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role))))) WITH CHECK ((id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: shadow_survey_runs dpo_update_own_org_survey_runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dpo_update_own_org_survey_runs ON public.shadow_survey_runs FOR UPDATE TO authenticated USING ((org_id IN ( SELECT ur.org_id
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'dpo'::public.app_role)))));


--
-- Name: assessments employee_insert_with_rijbewijs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_insert_with_rijbewijs ON public.assessments FOR INSERT WITH CHECK (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.has_ai_rijbewijs = true))))));


--
-- Name: assessments employee_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_read_own ON public.assessments FOR SELECT USING ((created_by = auth.uid()));


--
-- Name: incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_library ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: model_typekaart_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.model_typekaart_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: model_typekaarten; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.model_typekaarten ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_invite org_admin_dpo_manage_survey_invite; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_dpo_manage_survey_invite ON public.survey_invite TO authenticated USING ((public.is_super_admin(auth.uid()) OR ((public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR ((public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: survey_wave org_admin_dpo_manage_survey_wave; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_dpo_manage_survey_wave ON public.survey_wave TO authenticated USING ((public.is_super_admin(auth.uid()) OR ((public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR ((public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: survey_participation org_admin_dpo_select_survey_participation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_dpo_select_survey_participation ON public.survey_participation FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.survey_invite si
  WHERE ((si.id = survey_participation.invite_id) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())) AND (si.org_id = public.get_user_org_id(auth.uid())))))));


--
-- Name: survey_run org_admin_dpo_select_survey_run; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_dpo_select_survey_run ON public.survey_run FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR ((public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: dpo_notifications org_admin_manage_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_manage_notifications ON public.dpo_notifications USING (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid())))) WITH CHECK (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid()))));


--
-- Name: assessments org_admin_manage_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_manage_org ON public.assessments USING (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid())))) WITH CHECK (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid()))));


--
-- Name: incidents org_admin_manage_org_incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_manage_org_incidents ON public.incidents TO authenticated USING (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid())))) WITH CHECK (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid()))));


--
-- Name: org_notifications org_admin_manage_org_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_manage_org_notifications ON public.org_notifications TO authenticated USING (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid()) OR public.is_dpo(auth.uid())))) WITH CHECK (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid()))));


--
-- Name: org_tool_policy org_admin_manage_org_tool_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_manage_org_tool_policy ON public.org_tool_policy TO authenticated USING ((public.is_super_admin(auth.uid()) OR (public.is_org_admin(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid()))))) WITH CHECK ((public.is_super_admin(auth.uid()) OR (public.is_org_admin(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid())))));


--
-- Name: org_tools_catalog org_admin_manage_org_tools_catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_manage_org_tools_catalog ON public.org_tools_catalog USING (((public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid())))) WITH CHECK (((public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid())) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: passport_identity org_admin_manage_passport_identity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_manage_passport_identity ON public.passport_identity TO authenticated USING (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid())))) WITH CHECK (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_super_admin(auth.uid()))));


--
-- Name: assessment_ml_assignments org_admin_read_org_ml_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_read_org_ml_assignments ON public.assessment_ml_assignments FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (public.is_org_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.assessments a
  WHERE ((a.id = assessment_ml_assignments.assessment_id) AND (a.org_id = public.get_user_org_id(auth.uid()))))))));


--
-- Name: assessment_ml_completions org_admin_read_org_ml_completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_read_org_ml_completions ON public.assessment_ml_completions FOR SELECT TO authenticated USING ((public.is_super_admin(auth.uid()) OR (public.is_org_admin(auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.assessments a
  WHERE ((a.id = assessment_ml_completions.assessment_id) AND (a.org_id = public.get_user_org_id(auth.uid()))))))));


--
-- Name: profiles org_admin_update_org_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admin_update_org_profiles ON public.profiles FOR UPDATE TO authenticated USING ((public.is_org_admin(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid())))) WITH CHECK ((public.is_org_admin(auth.uid()) AND (org_id = public.get_user_org_id(auth.uid()))));


--
-- Name: org_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: shadow_survey_runs org_scoped_survey_runs_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_scoped_survey_runs_read ON public.shadow_survey_runs FOR SELECT TO authenticated USING (((org_id = public.get_user_org_id(auth.uid())) AND (public.is_org_admin(auth.uid()) OR public.is_dpo(auth.uid()) OR (user_id = auth.uid()))));


--
-- Name: org_tool_policy; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_tool_policy ENABLE ROW LEVEL SECURITY;

--
-- Name: org_tools_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_tools_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations organizations_no_anon_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizations_no_anon_read ON public.organizations FOR SELECT TO anon USING (false);


--
-- Name: passport_identity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.passport_identity ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_account_type public_read_ref_account_type; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_account_type ON public.ref_account_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_ai_frequency public_read_ref_ai_frequency; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_ai_frequency ON public.ref_ai_frequency FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_catalog_beheerstatus public_read_ref_catalog_beheerstatus; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_catalog_beheerstatus ON public.ref_catalog_beheerstatus FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_context public_read_ref_context; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_context ON public.ref_context FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_data_type public_read_ref_data_type; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_data_type ON public.ref_data_type FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_department public_read_ref_department; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_department ON public.ref_department FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_eu_ai_act_flag public_read_ref_eu_ai_act_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_eu_ai_act_flag ON public.ref_eu_ai_act_flag FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_governance_flag public_read_ref_governance_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_governance_flag ON public.ref_governance_flag FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_no_ai_reason public_read_ref_no_ai_reason; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_no_ai_reason ON public.ref_no_ai_reason FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_org_policy_status public_read_ref_org_policy_status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_org_policy_status ON public.ref_org_policy_status FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_review_trigger public_read_ref_review_trigger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_review_trigger ON public.ref_review_trigger FOR SELECT TO authenticated, anon USING (true);


--
-- Name: ref_use_case public_read_ref_use_case; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_ref_use_case ON public.ref_use_case FOR SELECT TO authenticated, anon USING (true);


--
-- Name: organizations public_scoreboard_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_scoreboard_read ON public.organizations FOR SELECT TO anon USING (((scoreboard_enabled = true) AND (scoreboard_slug IS NOT NULL)));


--
-- Name: ref_account_type; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_account_type ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_ai_frequency; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_ai_frequency ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_catalog_beheerstatus; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_catalog_beheerstatus ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_context; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_context ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_data_type; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_data_type ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_department; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_department ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_eu_ai_act_flag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_eu_ai_act_flag ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_governance_flag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_governance_flag ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_no_ai_reason; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_no_ai_reason ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_org_policy_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_org_policy_status ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_review_trigger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_review_trigger ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_use_case; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_use_case ENABLE ROW LEVEL SECURITY;

--
-- Name: rijbewijs_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rijbewijs_records ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_result; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.risk_result ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_result_tool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.risk_result_tool ENABLE ROW LEVEL SECURITY;

--
-- Name: scan_scoring_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scan_scoring_config ENABLE ROW LEVEL SECURITY;

--
-- Name: shadow_survey_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shadow_survey_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_result super_admin_delete_risk_result; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_delete_risk_result ON public.risk_result FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: risk_result_tool super_admin_delete_risk_result_tool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_delete_risk_result_tool ON public.risk_result_tool FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: tool_catalog_discovery super_admin_delete_tool_catalog_discovery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_delete_tool_catalog_discovery ON public.tool_catalog_discovery FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: archetype_ml_map super_admin_full_access_archetype_ml_map; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_full_access_archetype_ml_map ON public.archetype_ml_map TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: model_typekaart_updates super_admin_full_access_model_typekaart_updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_full_access_model_typekaart_updates ON public.model_typekaart_updates TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: model_typekaarten super_admin_full_access_model_typekaarten; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_full_access_model_typekaarten ON public.model_typekaarten TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: org_tools_catalog super_admin_full_org_tools_catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_full_org_tools_catalog ON public.org_tools_catalog USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: risk_result super_admin_insert_risk_result; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_insert_risk_result ON public.risk_result FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: risk_result_tool super_admin_insert_risk_result_tool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_insert_risk_result_tool ON public.risk_result_tool FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: profiles super_admin_update_all_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_update_all_profiles ON public.profiles FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: risk_result super_admin_update_risk_result; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_update_risk_result ON public.risk_result FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: risk_result_tool super_admin_update_risk_result_tool; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_update_risk_result_tool ON public.risk_result_tool FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: survey_data_type; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_data_type ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_invite; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_invite ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_motivation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_motivation ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_participation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_participation ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_run; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_run ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_support_need; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_support_need ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_tool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_tool ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_tool_account; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_tool_account ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_tool_preference_reason; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_tool_preference_reason ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_tool_use_case; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_tool_use_case ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_tool_use_case_context; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_tool_use_case_context ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_tool_use_case_flag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_tool_use_case_flag ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_top_concern; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_top_concern ENABLE ROW LEVEL SECURITY;

--
-- Name: survey_wave; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.survey_wave ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_ml_assignments system_insert_ml_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_insert_ml_assignments ON public.assessment_ml_assignments FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: tool_catalog_discovery; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tool_catalog_discovery ENABLE ROW LEVEL SECURITY;

--
-- Name: tool_discoveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tool_discoveries ENABLE ROW LEVEL SECURITY;

--
-- Name: tools_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tools_library ENABLE ROW LEVEL SECURITY;

--
-- Name: user_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_course_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_course_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_course_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: user_lesson_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_lesson_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_ml_completions user_manage_own_ml_completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_manage_own_ml_completions ON public.assessment_ml_completions TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: incidents user_read_own_incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_read_own_incidents ON public.incidents FOR SELECT TO authenticated USING ((reported_by = auth.uid()));


--
-- Name: assessment_ml_assignments user_read_own_ml_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_read_own_ml_assignments ON public.assessment_ml_assignments FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: incidents user_report_own_incident; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_report_own_incident ON public.incidents FOR INSERT TO authenticated WITH CHECK ((reported_by = auth.uid()));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: org_tools_catalog users_read_org_tools_catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_read_org_tools_catalog ON public.org_tools_catalog FOR SELECT USING ((org_id = public.get_user_org_id(auth.uid())));


--
-- Name: org_tool_policy users_select_org_tool_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_org_tool_policy ON public.org_tool_policy FOR SELECT TO authenticated USING ((org_id = public.get_user_org_id(auth.uid())));


--
-- PostgreSQL database dump complete
--

\unrestrict kH5fBJQCKyP8WP9vRZstNEQTRYLrWeSjNUcPADEere3dCC534qp6hV699SBM2ea

