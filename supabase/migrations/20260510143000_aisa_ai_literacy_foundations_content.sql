-- =============================================================================
-- AISA AI Literacy Foundations content
-- =============================================================================
-- Purpose:
--   Replace the first prototype course outline with the AISA AI Literacy
--   Foundations structure: EU AI Act Article 4 anchor, L1-L3 modules,
--   assessment evidence, and versioned compliance credential.
-- =============================================================================

UPDATE public.learning_courses
   SET title = 'AISA AI Literacy Foundations',
       subtitle = 'EU AI Act aligned',
       description = 'Risk-based, role-appropriate AI literacy training aligned with EU AI Act Article 4. De cursus vormt het RouteAI rijbewijs en kan stand-alone of embedded worden aangeboden.',
       regulatory_frameworks = ARRAY['eu_ai_act_article_4', 'eu_ai_act', 'avg_gdpr', 'internal_policy'],
       version = 2,
       updated_at = now()
 WHERE course_code = 'ai-literacy-foundation';

UPDATE public.learning_topics t
   SET status = 'archived',
       sequence_order = 1000 + t.sequence_order,
       updated_at = now()
  FROM public.learning_courses c
 WHERE t.course_id = c.id
   AND c.course_code = 'ai-literacy-foundation'
   AND t.topic_code NOT IN (
     'l1-ai-fundamentals',
     'l2-risk-responsibility',
     'l3-responsible-use',
     'l4-assessment-evidence'
   );

WITH course AS (
  SELECT id FROM public.learning_courses WHERE course_code = 'ai-literacy-foundation' LIMIT 1
),
topic_seed(topic_code, title, summary, sequence_order) AS (
  VALUES
    ('l1-ai-fundamentals', 'L1 - AI Fundamentals', 'Wat telt als AI, inclusief GenAI, GPAI en veelvoorkomende mythes.', 1),
    ('l2-risk-responsibility', 'L2 - Risk & Responsibility', 'AI-risiconiveaus, praktijkvoorbeelden en wat verboden of toegestaan is.', 2),
    ('l3-responsible-use', 'L3 - Responsible Use', 'Transparantie, human-in-the-loop, bias, data en veilige prompting.', 3),
    ('l4-assessment-evidence', 'Assessment & Evidence', 'Scenario-toetsing, bewijsstukken, geldigheid en positionering.', 4)
)
INSERT INTO public.learning_topics (
  course_id,
  topic_code,
  title,
  summary,
  status,
  sequence_order,
  is_required,
  version
)
SELECT c.id, s.topic_code, s.title, s.summary, 'published', s.sequence_order, true, 2
  FROM course c
  JOIN topic_seed s ON true
ON CONFLICT (course_id, topic_code) DO UPDATE
  SET title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      status = 'published',
      sequence_order = EXCLUDED.sequence_order,
      version = 2,
      updated_at = now();

WITH course AS (
  SELECT id FROM public.learning_courses WHERE course_code = 'ai-literacy-foundation' LIMIT 1
),
archived_pages AS (
  UPDATE public.learning_pages p
     SET status = 'archived',
         updated_at = now()
    FROM course c
   WHERE p.course_id = c.id
     AND p.page_code NOT LIKE 'aisa-%'
   RETURNING p.id
),
topics AS (
  SELECT t.id, t.topic_code, t.course_id
    FROM public.learning_topics t
    JOIN course c ON c.id = t.course_id
   WHERE t.topic_code IN (
     'l1-ai-fundamentals',
     'l2-risk-responsibility',
     'l3-responsible-use',
     'l4-assessment-evidence'
   )
),
page_seed AS (
  SELECT *
    FROM jsonb_to_recordset($$
[
  {
    "topic_code": "l1-ai-fundamentals",
    "page_code": "aisa-regulatory-anchor",
    "title": "Regulatory anchor",
    "summary": "EU AI Act Article 4 en de startdatum van de AI literacy verplichting.",
    "page_type": "content",
    "sequence_order": 1,
    "minutes": 5,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"hero","type":"hero","title":"AISA AI Literacy Foundations","subtitle":"EU AI Act aligned basisprogramma voor risk-based, role-appropriate literacy."},
        {"id":"anchor","type":"key_takeaways","items":["EU AI Act Article 4 maakt AI literacy verplicht.","De verplichting is van toepassing vanaf 2 februari 2025.","Literacy moet risk-based en passend bij de rol zijn."]},
        {"id":"outcomes","type":"checklist","items":["Uitleggen wat AI wel en niet is, inclusief GenAI en GPAI.","AI-risico's herkennen die relevant zijn voor de eigen rol.","AI verantwoord gebruiken binnen het bedrijfsbeleid.","Risico's op de juiste manier escaleren.","Verwachtingen rondom menselijk toezicht begrijpen."]}
      ]
    }
  },
  {
    "topic_code": "l1-ai-fundamentals",
    "page_code": "aisa-l1-what-counts-as-ai",
    "title": "Wat telt als AI onder de AI Act",
    "summary": "Een praktische afbakening van AI-systemen in de werkomgeving.",
    "page_type": "content",
    "sequence_order": 2,
    "minutes": 7,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"concept","type":"paragraph","markdown":"Onder de AI Act gaat het niet alleen om chatbots. Ook systemen die voorspellen, aanbevelen, classificeren of beslisondersteuning geven kunnen AI-systemen zijn."},
        {"id":"examples","type":"key_takeaways","items":["Een model dat sollicitaties rangschikt kan een AI-systeem zijn.","Een tool die klantvragen prioriteert kan een AI-systeem zijn.","Een simpele vaste beslisboom is niet automatisch AI."]},
        {"id":"check","type":"quiz_multiple_choice","question":"Wat is de beste eerste vraag bij twijfel of iets AI is?","options":[{"id":"a","label":"Gebruikt het systeem patronen, voorspellingen of classificaties?"},{"id":"b","label":"Heeft het systeem een modern dashboard?"},{"id":"c","label":"Is de leverancier een groot technologiebedrijf?"}],"correct_option_id":"a"}
      ]
    }
  },
  {
    "topic_code": "l1-ai-fundamentals",
    "page_code": "aisa-l1-genai-gpai",
    "title": "Basiskennis van Generatieve AI en GPAI",
    "summary": "Wat GenAI en general-purpose AI kunnen, en waar de grenzen liggen.",
    "page_type": "content",
    "sequence_order": 3,
    "minutes": 8,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"genai","type":"paragraph","markdown":"Generatieve AI maakt nieuwe tekst, beelden, code of andere output op basis van patronen in trainingsdata en context. GPAI-modellen kunnen breed worden toegepast en worden vaak ingebouwd in verschillende tools."},
        {"id":"limits","type":"callout","tone":"warning","markdown":"GenAI kan overtuigend klinken zonder juist te zijn. Hallucinaties, bias en ontbrekende context blijven normale risico's."},
        {"id":"myths","type":"checklist","items":["AI begrijpt niet automatisch de betekenis van output.","Een goede prompt is geen garantie op betrouwbare output.","GPAI in een goedgekeurde tool vraagt nog steeds passend gebruik."]}
      ]
    }
  },
  {
    "topic_code": "l2-risk-responsibility",
    "page_code": "aisa-l2-risk-levels",
    "title": "AI-risiconiveaus eenvoudig uitgelegd",
    "summary": "Van verboden gebruik tot beperkte en hogere risico's.",
    "page_type": "content",
    "sequence_order": 1,
    "minutes": 8,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"levels","type":"key_takeaways","items":["Sommige AI-toepassingen zijn verboden.","Hogere risico's vragen strengere waarborgen.","Ook beperkte risico's vragen transparantie en verantwoord gebruik."]},
        {"id":"routeai-link","type":"callout","tone":"info","markdown":"RouteAI operationaliseert deze classificatie straks via de risk engine. Deze cursus is het toegangsbewijs om usecases verantwoord te checken."}
      ]
    }
  },
  {
    "topic_code": "l2-risk-responsibility",
    "page_code": "aisa-l2-workplace-examples",
    "title": "Praktijkvoorbeelden uit de werkomgeving",
    "summary": "Herken AI-risico's in HR, klantcontact, beleid en analyse.",
    "page_type": "case",
    "sequence_order": 2,
    "minutes": 9,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"case-hr","type":"case_lab","title":"Voorbeeld: HR-beoordeling","markdown":"Een team wil AI gebruiken om beoordelingsgesprekken samen te vatten en promotiekandidaten te signaleren.","reflection_prompt":"Welke risico's zie je voor medewerkers, data en menselijke besluitvorming?"},
        {"id":"case-service","type":"case_lab","title":"Voorbeeld: klantprioritering","markdown":"Een AI-tool geeft urgentiescores aan klantvragen en stuurt sommige vragen sneller door.","reflection_prompt":"Wanneer wordt dit meer dan alleen administratieve ondersteuning?"}
      ]
    }
  },
  {
    "topic_code": "l2-risk-responsibility",
    "page_code": "aisa-l2-prohibited-allowed",
    "title": "Wat verboden is versus wat toegestaan is",
    "summary": "Een praktische escalatielens voor medewerkers.",
    "page_type": "question",
    "sequence_order": 3,
    "minutes": 7,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"boundary","type":"paragraph","markdown":"Medewerkers hoeven geen jurist te zijn, maar moeten wel herkennen wanneer een AI-toepassing niet zelf gestart mag worden en moet worden geëscaleerd."},
        {"id":"escalate","type":"checklist","items":["Raakt de AI toegang tot werk, onderwijs, zorg, geld of dienstverlening?","Worden personen beoordeeld, gerangschikt of uitgesloten?","Is de toepassing niet vooraf goedgekeurd of onduidelijk beschreven?"]},
        {"id":"question","type":"short_answer","question":"Noem één voorbeeld waarin jij eerst zou escaleren voordat AI wordt gebruikt.","placeholder":"Beschrijf kort de situatie en waarom escalatie nodig is.","min_words":20}
      ]
    }
  },
  {
    "topic_code": "l3-responsible-use",
    "page_code": "aisa-l3-transparency",
    "title": "Transparantie",
    "summary": "Wanneer en hoe maak je AI-gebruik zichtbaar?",
    "page_type": "content",
    "sequence_order": 1,
    "minutes": 6,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"transparency","type":"paragraph","markdown":"Transparantie betekent dat betrokkenen en collega's kunnen begrijpen dat AI is gebruikt, waarvoor het is gebruikt en welke menselijke controle heeft plaatsgevonden."},
        {"id":"takeaways","type":"key_takeaways","items":["Verberg AI-gebruik niet wanneer het relevant is voor vertrouwen of besluitvorming.","Leg vast welke AI-output is gebruikt en wie deze heeft beoordeeld.","Gebruik geen AI-output alsof het een gevalideerde bron is."]}
      ]
    }
  },
  {
    "topic_code": "l3-responsible-use",
    "page_code": "aisa-l3-human-in-the-loop",
    "title": "Human-in-the-loop",
    "summary": "Menselijk toezicht dat echt iets betekent.",
    "page_type": "case",
    "sequence_order": 2,
    "minutes": 8,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"oversight","type":"paragraph","markdown":"Menselijk toezicht is geen vinkje. De reviewer moet kunnen ingrijpen, de output begrijpen, afwijkingen herkennen en verantwoordelijkheid nemen voor de uiteindelijke handeling."},
        {"id":"checklist","type":"checklist","items":["Kan ik uitleggen waarom ik de output accepteer of afwijs?","Heb ik voldoende context om de output te beoordelen?","Is er een escalatieroute als de output twijfelachtig is?"]}
      ]
    }
  },
  {
    "topic_code": "l3-responsible-use",
    "page_code": "aisa-l3-bias-data",
    "title": "Bewustzijn van bias en data",
    "summary": "Data bepaalt vaak het risico van een AI-toepassing.",
    "page_type": "content",
    "sequence_order": 3,
    "minutes": 8,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"data","type":"callout","tone":"warning","markdown":"Persoonsgegevens, bijzondere persoonsgegevens, bedrijfsvertrouwelijke informatie en context over kwetsbare personen vragen extra waarborgen."},
        {"id":"bias","type":"paragraph","markdown":"Bias kan ontstaan door trainingsdata, selectie van input, historische patronen of verkeerde interpretatie van output. Daarom moet AI-output altijd in context worden beoordeeld."},
        {"id":"quiz","type":"quiz_true_false","question":"Geanonimiseerde input is altijd veilig om in elke AI-tool te gebruiken.","correct_answer":false,"explanation":"Ook contextueel herleidbare of vertrouwelijke informatie kan risico's opleveren. Toolbeleid en dataclassificatie blijven nodig."}
      ]
    }
  },
  {
    "topic_code": "l3-responsible-use",
    "page_code": "aisa-l3-safe-prompting",
    "title": "Prompting basics: veilig gebruik",
    "summary": "Praktisch prompten zonder gevoelige data of omwegen.",
    "page_type": "question",
    "sequence_order": 4,
    "minutes": 7,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"safe","type":"key_takeaways","items":["Gebruik geen gevoelige data in niet-goedgekeurde tools.","Vraag AI om beperkingen en onzekerheden expliciet te benoemen.","Gebruik geen prompts om beleid, beveiliging of beperkingen te omzeilen."]},
        {"id":"prompt","type":"short_answer","question":"Herschrijf een risicovolle prompt naar een veilige prompt zonder gevoelige data.","placeholder":"Beschrijf je veilige variant.","min_words":25}
      ]
    }
  },
  {
    "topic_code": "l4-assessment-evidence",
    "page_code": "aisa-assessment",
    "title": "Scenario-gebaseerde toetsing",
    "summary": "Open-book assessment met rol-specifieke varianten.",
    "page_type": "assessment",
    "sequence_order": 1,
    "minutes": 10,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"assessment","type":"case_lab","title":"Scenario completion evidence","markdown":"Deelnemers werken met scenario's die passen bij hun rol. Het doel is niet memoriseren, maar aantonen dat zij risico's herkennen, verantwoord handelen en op tijd escaleren.","reflection_prompt":"Welke informatie heb je nodig voordat je deze AI-usecase veilig kunt beoordelen?"},
        {"id":"variants","type":"checklist","items":["Open book toetsing.","Rol-specifieke varianten.","Bewijs van scenario completion."]}
      ]
    }
  },
  {
    "topic_code": "l4-assessment-evidence",
    "page_code": "aisa-outputs-evidence",
    "title": "Outputs en bewijsstukken",
    "summary": "Wat de organisatie en deelnemer kunnen aantonen.",
    "page_type": "content",
    "sequence_order": 2,
    "minutes": 5,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"outputs","type":"key_takeaways","items":["Individueel certificaat van afronding.","Organisatorisch trainingslogboek.","Resultaten van scenario-assessments.","Bewijs van scenario completion."]},
        {"id":"delivery","type":"callout","tone":"info","markdown":"De training kan online, als live workshop van 2-3 uur, of blended worden aangeboden. Blended is de voorkeursvariant."}
      ]
    }
  },
  {
    "topic_code": "l4-assessment-evidence",
    "page_code": "aisa-versioned-credential",
    "title": "Versioned compliance credential",
    "summary": "Credential wording, geldigheid en refreshers.",
    "page_type": "content",
    "sequence_order": 3,
    "minutes": 6,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"credential","type":"hero","title":"AISA AI Governance Foundations - v2026.1","subtitle":"Proof of AI literacy & governance training aligned with EU AI Act Article 4."},
        {"id":"why-versioned","type":"key_takeaways","items":["Wetgeving ontwikkelt zich.","Guidance ontwikkelt zich.","Jurisprudentie ontwikkelt zich.","Reasonable measures ontwikkelen zich."]},
        {"id":"validity","type":"callout","tone":"success","markdown":"Credential geldig voor 12-18 maanden. Daarna volgt een lichte refresher, bijvoorbeeld v2027.1 of v2028.1."}
      ]
    }
  },
  {
    "topic_code": "l4-assessment-evidence",
    "page_code": "aisa-positioning",
    "title": "Positionering",
    "summary": "Stand-alone en embedded binnen KIT/RouteAI.",
    "page_type": "content",
    "sequence_order": 4,
    "minutes": 4,
    "content": {
      "version": 1,
      "blocks": [
        {"id":"positioning","type":"key_takeaways","items":["Stand-alone te verkopen als compliance-ready AI-literacy training.","Embedded als verplicht onderdeel binnen de KIT.","In RouteAI fungeert afronding als harde toegangseis voor usecase checks."]}
      ]
    }
  }
]
$$::jsonb) AS p(
      topic_code text,
      page_code text,
      title text,
      summary text,
      page_type text,
      sequence_order int,
      minutes int,
      content jsonb
    )
)
INSERT INTO public.learning_pages (
  course_id,
  topic_id,
  page_code,
  title,
  summary,
  page_type,
  status,
  estimated_duration_minutes,
  sequence_order,
  is_required,
  content_schema_version,
  content,
  version
)
SELECT
  t.course_id,
  t.id,
  p.page_code,
  p.title,
  p.summary,
  p.page_type,
  'published',
  p.minutes,
  p.sequence_order,
  true,
  1,
  p.content,
  2
FROM page_seed p
JOIN topics t ON t.topic_code = p.topic_code
ON CONFLICT (course_id, page_code) DO UPDATE
  SET topic_id = EXCLUDED.topic_id,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      page_type = EXCLUDED.page_type,
      status = 'published',
      estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
      sequence_order = EXCLUDED.sequence_order,
      content = EXCLUDED.content,
      version = 2,
      updated_at = now();

UPDATE public.learning_access_requirements lar
   SET title = 'AISA AI Literacy vereist voor RouteAI',
       description = 'Medewerkers moeten AISA AI Literacy Foundations afronden voordat zij RouteAI usecase checks kunnen uitvoeren.',
       validity_months = 18,
       updated_at = now()
  FROM public.learning_courses c
 WHERE lar.required_course_id = c.id
   AND c.course_code = 'ai-literacy-foundation'
   AND lar.capability_code = 'routeai_usecase_check';
