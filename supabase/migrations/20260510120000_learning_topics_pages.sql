-- =============================================================================
-- RouteAI Learning topics, pages, and page progress
-- =============================================================================
-- Purpose:
--   Move the learner model from flat lessons toward the authored shape used by
--   the Learning System: course -> topic -> page -> JSONB blocks.
--   Existing learning_lessons remain in place for compatibility and for the
--   future microlearning library.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.learning_topics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  org_id          uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  topic_code      text NOT NULL,
  title           text NOT NULL,
  summary         text,
  status          text NOT NULL DEFAULT 'published',
  sequence_order  int NOT NULL,
  is_required     boolean NOT NULL DEFAULT true,
  version         int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_topics_status_chk CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT learning_topics_order_chk CHECK (sequence_order > 0),
  CONSTRAINT learning_topics_code_unique UNIQUE (course_id, topic_code),
  CONSTRAINT learning_topics_order_unique UNIQUE (course_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS learning_topics_course_idx
  ON public.learning_topics(course_id, sequence_order);

CREATE TABLE IF NOT EXISTS public.learning_pages (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id                  uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  topic_id                   uuid NOT NULL REFERENCES public.learning_topics(id) ON DELETE CASCADE,
  org_id                     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_code                  text NOT NULL,
  title                      text NOT NULL,
  summary                    text,
  page_type                  text NOT NULL DEFAULT 'content',
  status                     text NOT NULL DEFAULT 'published',
  estimated_duration_minutes int,
  sequence_order             int NOT NULL,
  is_required                boolean NOT NULL DEFAULT true,
  content_schema_version     int NOT NULL DEFAULT 1,
  content                    jsonb NOT NULL DEFAULT '{"version":1,"blocks":[]}'::jsonb,
  version                    int NOT NULL DEFAULT 1,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_pages_type_chk
    CHECK (page_type IN ('content', 'video', 'question', 'case', 'embed', 'assessment')),
  CONSTRAINT learning_pages_status_chk CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT learning_pages_duration_chk
    CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  CONSTRAINT learning_pages_order_chk CHECK (sequence_order > 0),
  CONSTRAINT learning_pages_content_chk CHECK (public.learning_content_is_valid(content)),
  CONSTRAINT learning_pages_code_unique UNIQUE (course_id, page_code),
  CONSTRAINT learning_pages_topic_order_unique UNIQUE (topic_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS learning_pages_course_idx
  ON public.learning_pages(course_id, sequence_order);

CREATE INDEX IF NOT EXISTS learning_pages_topic_idx
  ON public.learning_pages(topic_id, sequence_order);

CREATE INDEX IF NOT EXISTS learning_pages_content_idx
  ON public.learning_pages USING gin(content);

CREATE TABLE IF NOT EXISTS public.learning_page_progress (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id               uuid NOT NULL REFERENCES public.learning_pages(id) ON DELETE CASCADE,
  course_id             uuid NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'not_started',
  current_block_id      text,
  completed_block_ids   jsonb NOT NULL DEFAULT '[]'::jsonb,
  progress_percentage   int NOT NULL DEFAULT 0,
  started_at            timestamptz,
  completed_at          timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_page_progress_status_chk
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  CONSTRAINT learning_page_progress_blocks_chk
    CHECK (jsonb_typeof(completed_block_ids) = 'array'),
  CONSTRAINT learning_page_progress_percentage_chk
    CHECK (progress_percentage BETWEEN 0 AND 100),
  CONSTRAINT learning_page_progress_unique UNIQUE (user_id, page_id, course_id)
);

CREATE INDEX IF NOT EXISTS learning_page_progress_org_status_idx
  ON public.learning_page_progress(org_id, status);

CREATE TRIGGER trg_learning_topics_updated
  BEFORE UPDATE ON public.learning_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_pages_updated
  BEFORE UPDATE ON public.learning_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_page_progress_updated
  BEFORE UPDATE ON public.learning_page_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.learning_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_page_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_topics_select_if_course_visible ON public.learning_topics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.learning_courses c
       WHERE c.id = course_id
         AND (
           public.is_super_admin(auth.uid())
           OR (c.status = 'published' AND c.org_id IS NULL)
           OR (c.org_id IS NOT NULL AND c.org_id = public.get_user_org_id(auth.uid()))
         )
    )
  );

CREATE POLICY learning_topics_manage_admin ON public.learning_topics
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id));

CREATE POLICY learning_pages_select_if_course_visible ON public.learning_pages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.learning_courses c
       WHERE c.id = course_id
         AND (
           public.is_super_admin(auth.uid())
           OR (c.status = 'published' AND c.org_id IS NULL)
           OR (c.org_id IS NOT NULL AND c.org_id = public.get_user_org_id(auth.uid()))
         )
    )
  );

CREATE POLICY learning_pages_manage_admin ON public.learning_pages
  FOR ALL TO authenticated
  USING (public.is_learning_admin_for(org_id))
  WITH CHECK (public.is_learning_admin_for(org_id));

CREATE POLICY learning_page_progress_select_self_or_admin ON public.learning_page_progress
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.is_org_admin_or_dpo_for(org_id)
  );

CREATE POLICY learning_page_progress_insert_self_or_admin ON public.learning_page_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND org_id = public.get_user_org_id(auth.uid()))
    OR public.is_learning_admin_for(org_id)
  );

CREATE POLICY learning_page_progress_update_self_or_admin ON public.learning_page_progress
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_learning_admin_for(org_id)
  )
  WITH CHECK (
    (user_id = auth.uid() AND org_id = public.get_user_org_id(auth.uid()))
    OR public.is_learning_admin_for(org_id)
  );

WITH course AS (
  SELECT id
    FROM public.learning_courses
   WHERE course_code = 'ai-literacy-foundation'
   LIMIT 1
),
topic_seed(topic_code, title, summary, sequence_order) AS (
  VALUES
    ('ai-basics', 'AI begrijpen', 'Een nuchtere basis voor medewerkers die AI-output gebruiken.', 1),
    ('data-care', 'Data, vertrouwelijkheid en AI-tools', 'Welke data mag wel, niet of alleen onder voorwaarden in AI-tools?', 2),
    ('human-oversight', 'Menselijk toezicht dat echt iets betekent', 'Maak van human-in-the-loop geen vinkje, maar een controlehandeling.', 3)
)
INSERT INTO public.learning_topics (
  course_id,
  topic_code,
  title,
  summary,
  sequence_order,
  is_required
)
SELECT c.id, s.topic_code, s.title, s.summary, s.sequence_order, true
  FROM course c
  JOIN topic_seed s ON true
ON CONFLICT (course_id, topic_code) DO UPDATE
  SET title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      sequence_order = EXCLUDED.sequence_order,
      updated_at = now();

WITH course AS (
  SELECT id FROM public.learning_courses WHERE course_code = 'ai-literacy-foundation' LIMIT 1
),
topics AS (
  SELECT t.id, t.topic_code, t.course_id
    FROM public.learning_topics t
    JOIN course c ON c.id = t.course_id
),
page_seed AS (
  SELECT
    'ai-basics'::text AS topic_code,
    'ai-literacy-what-is-ai'::text AS page_code,
    'Wat is AI en wat is het niet?'::text AS title,
    'AI voorspelt patronen, maar begrijpt niet wat het produceert.'::text AS summary,
    'content'::text AS page_type,
    1::int AS sequence_order,
    6::int AS minutes,
    '{
      "version": 1,
      "blocks": [
        {"id":"hero","type":"hero","title":"Wat is AI?","subtitle":"Begrijp het systeem voordat je de output vertrouwt."},
        {"id":"concept","type":"paragraph","markdown":"AI-systemen herkennen patronen en genereren voorspellingen of output. Ze hebben geen bewustzijn, geen intentie en geen garantie op waarheid."},
        {"id":"practice","type":"case_lab","title":"Praktijksituatie","markdown":"Een collega laat AI een advies samenvatten voor een klant. Wat moet je controleren voordat het advies wordt gebruikt?","reflection_prompt":"Noem twee controles die jij altijd zou uitvoeren."},
        {"id":"quiz-1","type":"quiz_multiple_choice","question":"Welke uitspraak is het meest juist?","options":[{"id":"a","label":"AI begrijpt teksten zoals mensen dat doen."},{"id":"b","label":"AI voorspelt waarschijnlijke output op basis van patronen."},{"id":"c","label":"AI-output is betrouwbaar zodra de prompt duidelijk is."}],"correct_option_id":"b","explanation":"Een duidelijke prompt helpt, maar neemt hallucinaties, bias of contextverlies niet weg."}
      ]
    }'::jsonb AS content
  UNION ALL
  SELECT
    'ai-basics',
    'ai-literacy-output-check',
    'AI-output controleren',
    'Een praktische routine voor bron, context en plausibiliteit.',
    'question',
    2,
    5,
    '{
      "version": 1,
      "blocks": [
        {"id":"intro","type":"paragraph","markdown":"Controleer AI-output altijd op bronkwaliteit, ontbrekende context, feitelijke juistheid en mogelijke impact voordat je ermee verder werkt."},
        {"id":"checklist","type":"checklist","items":["Welke aannames doet de AI?","Welke bron of input ontbreekt?","Wie kan geraakt worden als deze output fout is?"]},
        {"id":"reflection","type":"short_answer","question":"Welke controle zou jij toevoegen voordat AI-output in een klant- of beleidscontext wordt gebruikt?","placeholder":"Beschrijf je controle in een paar zinnen.","min_words":20,"guidance":"Denk aan broncontrole, menselijke review, privacy of impact op betrokkenen."}
      ]
    }'::jsonb
  UNION ALL
  SELECT
    'data-care',
    'ai-literacy-data-and-confidentiality',
    'Data en vertrouwelijkheid',
    'Leer welke data je wel en niet in AI-tools verwerkt.',
    'content',
    1,
    7,
    '{
      "version": 1,
      "blocks": [
        {"id":"hero","type":"hero","title":"Data bepaalt het risico","subtitle":"Niet elke AI-taak is gelijk. De data maakt vaak het verschil."},
        {"id":"data-types","type":"key_takeaways","items":["Persoonsgegevens vragen altijd extra zorg.","Bijzondere persoonsgegevens en HR-contexten vragen expliciete beoordeling.","Bedrijfsvertrouwelijke informatie hoort alleen in goedgekeurde tools en accounts."]},
        {"id":"policy-callout","type":"callout","tone":"warning","markdown":"Als je niet weet of een tool is goedgekeurd, behandel de output en invoer als onder review. Vraag beleid op voordat je gevoelige data verwerkt."},
        {"id":"quiz-1","type":"quiz_true_false","question":"Een gratis persoonlijk AI-account is geschikt voor interne klantdata als je de naam weglaat.","correct_answer":false,"explanation":"Ook pseudonieme of contextueel herleidbare data kan gevoelig zijn. Accounttype en toolbeleid blijven relevant."}
      ]
    }'::jsonb
  UNION ALL
  SELECT
    'data-care',
    'ai-literacy-approved-tools',
    'Goedgekeurde tools en accounts',
    'Waarom accounttype, contract en toolbeleid uitmaken.',
    'embed',
    2,
    4,
    '{
      "version": 1,
      "blocks": [
        {"id":"callout","type":"callout","tone":"info","markdown":"Een goedgekeurde AI-tool is niet alleen een handige app. Het gaat om contractuele waarborgen, logging, dataverwerking en duidelijke afspraken over gebruik."},
        {"id":"policy-frame","type":"iframe","title":"Interne AI-tooling policy","url":"https://example.com/ai-policy-placeholder","height":320,"caption":"Placeholder voor een toekomstige policy-embed of klantdocument."}
      ]
    }'::jsonb
  UNION ALL
  SELECT
    'human-oversight',
    'ai-literacy-human-oversight',
    'Menselijk toezicht',
    'AI mag ondersteunen, maar niet ongemerkt beslissen.',
    'case',
    1,
    8,
    '{
      "version": 1,
      "blocks": [
        {"id":"hero","type":"hero","title":"Jij blijft verantwoordelijk","subtitle":"AI mag ondersteunen, maar niet ongemerkt beslissen."},
        {"id":"oversight-model","type":"paragraph","markdown":"Goed toezicht betekent dat je weet wat de AI heeft gedaan, welke informatie ontbreekt, welke gevolgen de output kan hebben, en welke beslissing jij zelf neemt."},
        {"id":"checklist","type":"checklist","items":["Kan ik uitleggen waarop de output is gebaseerd?","Is er sprake van impact op een persoon, baan, toegang, geld of beoordeling?","Heb ik afwijkingen, twijfel of contextverschillen vastgelegd?"]},
        {"id":"quiz-1","type":"quiz_essay","question":"Beschrijf een situatie waarin AI-output niet direct gebruikt mag worden zonder extra controle.","min_words":60,"max_words":180,"manual_review_required":true}
      ]
    }'::jsonb
  UNION ALL
  SELECT
    'human-oversight',
    'ai-literacy-routeai-readiness',
    'RouteAI readiness check',
    'De afrondende check voordat RouteAI usecase checks open gaan.',
    'assessment',
    2,
    6,
    '{
      "version": 1,
      "blocks": [
        {"id":"scenario","type":"case_lab","title":"Mini-casus","markdown":"Je team wil een AI-tool gebruiken om binnenkomende klantvragen te prioriteren. De tool verwerkt tekst van klanten en geeft een urgentiescore.","reflection_prompt":"Welke risico''s moet RouteAI straks minimaal classificeren voordat dit gebruik live mag?"},
        {"id":"quiz-risk","type":"quiz_multiple_select","question":"Welke punten horen in ieder geval in de usecase check?","options":[{"id":"a","label":"Verwerkte persoonsgegevens of vertrouwelijke data"},{"id":"b","label":"Impact op klanten of toegang tot dienstverlening"},{"id":"c","label":"Alleen de kleur van de applicatie-interface"},{"id":"d","label":"Menselijke controle op de AI-score"}],"correct_option_ids":["a","b","d"],"explanation":"RouteAI moet vooral data, impact, context en toezicht operationaliseren."}
      ]
    }'::jsonb
)
INSERT INTO public.learning_pages (
  course_id,
  topic_id,
  page_code,
  title,
  summary,
  page_type,
  estimated_duration_minutes,
  sequence_order,
  is_required,
  content_schema_version,
  content
)
SELECT
  t.course_id,
  t.id,
  p.page_code,
  p.title,
  p.summary,
  p.page_type,
  p.minutes,
  p.sequence_order,
  true,
  1,
  p.content
FROM page_seed p
JOIN topics t ON t.topic_code = p.topic_code
ON CONFLICT (course_id, page_code) DO UPDATE
  SET topic_id = EXCLUDED.topic_id,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      page_type = EXCLUDED.page_type,
      estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
      sequence_order = EXCLUDED.sequence_order,
      content = EXCLUDED.content,
      updated_at = now();
