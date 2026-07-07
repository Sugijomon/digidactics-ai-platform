-- =============================================================================
-- RouteAI Learning Seed
-- =============================================================================
-- Minimal platform content based on the useful Lovable Learning System concepts,
-- rewritten as clean, versioned RouteAI learning content.
-- =============================================================================

WITH inserted_literacy_course AS (
  INSERT INTO public.learning_courses (
    course_code,
    title,
    subtitle,
    description,
    status,
    difficulty_level,
    audience_roles,
    sector_tags,
    regulatory_frameworks,
    required_for_onboarding,
    unlocks_capability,
    passing_threshold,
    version,
    published_at
  )
  VALUES (
    'ai-literacy-foundation',
    'AI Literacy voor verantwoord AI-gebruik',
    'Van praktisch begrip naar verantwoord handelen',
    'Basisprogramma voor medewerkers die AI-tools gebruiken of AI-output beoordelen. De cursus combineert praktische AI-geletterdheid met governance, datazorg en menselijk toezicht.',
    'published',
    'foundation',
    ARRAY['user', 'manager', 'dpo', 'org_admin'],
    ARRAY['sme', 'cross_sector'],
    ARRAY['eu_ai_act', 'avg_gdpr', 'internal_policy'],
    true,
    'ai_check',
    80,
    1,
    now()
  )
  ON CONFLICT DO NOTHING
  RETURNING id, course_code
),
literacy_course AS (
  SELECT id, course_code
    FROM inserted_literacy_course
  UNION ALL
  SELECT id, course_code
    FROM public.learning_courses
   WHERE course_code = 'ai-literacy-foundation'
   LIMIT 1
),
inserted_lessons AS (
  INSERT INTO public.learning_lessons (
    lesson_code,
    title,
    summary,
    lesson_type,
    status,
    difficulty_level,
    estimated_duration_minutes,
    content_schema_version,
    content,
    sector_tags,
    use_case_codes,
    context_codes,
    trigger_codes,
    regulatory_frameworks,
    ai_act_archetypes,
    version,
    published_at
  )
  VALUES
  (
    'ai-literacy-what-is-ai',
    'Wat is AI en wat is het niet?',
    'Een nuchtere basis: AI voorspelt patronen, maar begrijpt niet wat het produceert.',
    'lesson',
    'published',
    'foundation',
    8,
    1,
    '{
      "version": 1,
      "blocks": [
        {
          "id": "hero",
          "type": "hero",
          "title": "Wat is AI?",
          "subtitle": "Begrijp het systeem voordat je de output vertrouwt."
        },
        {
          "id": "concept",
          "type": "paragraph",
          "markdown": "AI-systemen herkennen patronen en genereren voorspellingen of output. Ze hebben geen bewustzijn, geen intentie en geen garantie op waarheid. Dat maakt menselijke beoordeling geen formaliteit, maar onderdeel van verantwoord gebruik."
        },
        {
          "id": "practice",
          "type": "case_lab",
          "title": "Praktijksituatie",
          "markdown": "Een collega laat AI een advies samenvatten voor een klant. Wat moet je controleren voordat het advies wordt gebruikt?",
          "reflection_prompt": "Noem twee controles die jij altijd zou uitvoeren."
        },
        {
          "id": "quiz-1",
          "type": "quiz_multiple_choice",
          "question": "Welke uitspraak is het meest juist?",
          "options": [
            {"id": "a", "label": "AI begrijpt teksten zoals mensen dat doen."},
            {"id": "b", "label": "AI voorspelt waarschijnlijke output op basis van patronen."},
            {"id": "c", "label": "AI-output is betrouwbaar zodra de prompt duidelijk is."}
          ],
          "correct_option_id": "b",
          "explanation": "Een duidelijk prompt helpt, maar neemt hallucinaties, bias of contextverlies niet weg."
        }
      ]
    }'::jsonb,
    ARRAY['sme', 'cross_sector'],
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY['human_review'],
    ARRAY['eu_ai_act', 'avg_gdpr'],
    ARRAY[]::text[],
    1,
    now()
  ),
  (
    'ai-literacy-data-and-confidentiality',
    'Data, vertrouwelijkheid en AI-tools',
    'Leer welke data je wel en niet in AI-tools verwerkt, en wanneer extra waarborgen nodig zijn.',
    'lesson',
    'published',
    'foundation',
    10,
    1,
    '{
      "version": 1,
      "blocks": [
        {
          "id": "hero",
          "type": "hero",
          "title": "Data bepaalt het risico",
          "subtitle": "Niet elke AI-taak is gelijk. De data maakt vaak het verschil."
        },
        {
          "id": "data-types",
          "type": "key_takeaways",
          "items": [
            "Persoonsgegevens vragen altijd extra zorg.",
            "Bijzondere persoonsgegevens en HR-contexten vragen expliciete beoordeling.",
            "Bedrijfsvertrouwelijke informatie hoort alleen in goedgekeurde tools en accounts."
          ]
        },
        {
          "id": "policy-callout",
          "type": "callout",
          "tone": "warning",
          "markdown": "Als je niet weet of een tool is goedgekeurd, behandel de output en invoer als onder review. Vraag beleid op voordat je gevoelige data verwerkt."
        },
        {
          "id": "quiz-1",
          "type": "quiz_true_false",
          "question": "Een gratis persoonlijk AI-account is geschikt voor interne klantdata als je de naam weglaat.",
          "correct_answer": false,
          "explanation": "Ook pseudonieme of contextueel herleidbare data kan gevoelig zijn. Accounttype en toolbeleid blijven relevant."
        }
      ]
    }'::jsonb,
    ARRAY['sme', 'cross_sector'],
    ARRAY[]::text[],
    ARRAY['hr', 'legal', 'customer_data'],
    ARRAY['sensitive_data', 'personal_account'],
    ARRAY['avg_gdpr', 'eu_ai_act', 'internal_policy'],
    ARRAY[]::text[],
    1,
    now()
  ),
  (
    'ai-literacy-human-oversight',
    'Menselijk toezicht dat echt iets betekent',
    'Maak van human-in-the-loop geen vinkje, maar een concrete controlehandeling.',
    'case_lab',
    'published',
    'foundation',
    12,
    1,
    '{
      "version": 1,
      "blocks": [
        {
          "id": "hero",
          "type": "hero",
          "title": "Jij blijft verantwoordelijk",
          "subtitle": "AI mag ondersteunen, maar niet ongemerkt beslissen."
        },
        {
          "id": "oversight-model",
          "type": "paragraph",
          "markdown": "Goed toezicht betekent dat je weet wat de AI heeft gedaan, welke informatie ontbreekt, welke gevolgen de output kan hebben, en welke beslissing jij zelf neemt."
        },
        {
          "id": "checklist",
          "type": "checklist",
          "items": [
            "Kan ik uitleggen waarop de output is gebaseerd?",
            "Is er sprake van impact op een persoon, baan, toegang, geld of beoordeling?",
            "Heb ik afwijkingen, twijfel of contextverschillen vastgelegd?"
          ]
        },
        {
          "id": "quiz-1",
          "type": "quiz_essay",
          "question": "Beschrijf een situatie waarin AI-output niet direct gebruikt mag worden zonder extra controle.",
          "min_words": 60,
          "max_words": 180,
          "manual_review_required": true
        }
      ]
    }'::jsonb,
    ARRAY['sme', 'cross_sector'],
    ARRAY['hr_evaluation', 'decision_support', 'customer_advice'],
    ARRAY['hr', 'customer_impact', 'legal'],
    ARRAY['human_review', 'high_impact_context'],
    ARRAY['eu_ai_act', 'avg_gdpr', 'internal_policy'],
    ARRAY['O-01', 'O-02'],
    1,
    now()
  )
  ON CONFLICT DO NOTHING
  RETURNING id, lesson_code
),
lessons AS (
  SELECT id, lesson_code
    FROM inserted_lessons
  UNION ALL
  SELECT id, lesson_code
    FROM public.learning_lessons
   WHERE lesson_code IN (
     'ai-literacy-what-is-ai',
     'ai-literacy-data-and-confidentiality',
     'ai-literacy-human-oversight'
   )
)
INSERT INTO public.learning_course_lessons (course_id, lesson_id, sequence_order, is_required)
SELECT c.id, l.id, x.sequence_order, true
  FROM literacy_course c
  JOIN lessons l ON true
  JOIN (
    VALUES
      ('ai-literacy-what-is-ai', 1),
      ('ai-literacy-data-and-confidentiality', 2),
      ('ai-literacy-human-oversight', 3)
  ) AS x(lesson_code, sequence_order)
    ON x.lesson_code = l.lesson_code
ON CONFLICT DO NOTHING;

INSERT INTO public.learning_recommendation_rules (
  rule_code,
  title,
  rationale,
  source_scope,
  trigger_codes,
  use_case_codes,
  context_codes,
  score_tiers,
  review_classes,
  course_id,
  priority
)
SELECT
  'routeai-ai-literacy-access-gate',
  'AI Literacy als RouteAI toegangseis',
  'Medewerkers moeten de AI Literacy basis afronden voordat zij RouteAI gebruiken om AI-usecases te checken.',
  'routeai',
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  c.id,
  10
FROM public.learning_courses c
WHERE c.course_code = 'ai-literacy-foundation'
ON CONFLICT DO NOTHING;

INSERT INTO public.learning_recommendation_rules (
  rule_code,
  title,
  rationale,
  source_scope,
  trigger_codes,
  use_case_codes,
  context_codes,
  lesson_id,
  priority
)
SELECT
  'routeai-medium-sensitive-data-control',
  'Microlearning bij gevoelige data',
  'RouteAI usecases met verhoogd risico door gevoelige of vertrouwelijke data vragen gerichte datageletterdheid.',
  'routeai',
  ARRAY['sensitive_data', 'confidential_data'],
  ARRAY[]::text[],
  ARRAY[]::text[],
  l.id,
  30
FROM public.learning_lessons l
WHERE l.lesson_code = 'ai-literacy-data-and-confidentiality'
ON CONFLICT DO NOTHING;

INSERT INTO public.learning_recommendation_rules (
  rule_code,
  title,
  rationale,
  source_scope,
  trigger_codes,
  use_case_codes,
  context_codes,
  lesson_id,
  priority
)
SELECT
  'routeai-high-human-oversight',
  'Human oversight bij impactvolle toepassingen',
  'RouteAI usecases met hoge impact op personen, beoordelingen of beslissingen vragen concreet menselijk toezicht.',
  'routeai',
  ARRAY['human_review', 'high_impact_context'],
  ARRAY['hr_evaluation', 'decision_support'],
  ARRAY['hr', 'customer_impact', 'legal'],
  l.id,
  40
FROM public.learning_lessons l
WHERE l.lesson_code = 'ai-literacy-human-oversight'
ON CONFLICT DO NOTHING;

INSERT INTO public.learning_access_requirements (
  capability_code,
  required_certification_code,
  required_course_id,
  title,
  description,
  validity_months,
  is_active
)
SELECT
  'routeai_usecase_check',
  'ai_literacy_foundation',
  c.id,
  'AI Literacy vereist voor RouteAI',
  'Medewerkers moeten het AI Literacy foundation certificaat hebben voordat zij RouteAI usecase checks kunnen uitvoeren.',
  12,
  true
FROM public.learning_courses c
WHERE c.course_code = 'ai-literacy-foundation'
ON CONFLICT DO NOTHING;
