-- =============================================================================
-- RouteAI AI Literacy Context Pack pilot fixture
-- =============================================================================
-- FICTITIOUS LOCAL/STAGING DATA. Do not run this seed on production.
--
-- The release id and organization id are deterministic so the seed is
-- repeatable. Published releases are immutable: change the version and id when
-- the example content changes after it has been loaded once.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.learning_courses
    WHERE course_code = 'ai-literacy-foundation'
      AND org_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Run the Learning and AI Literacy migrations before the Context Pack pilot seed';
  END IF;
END;
$$;

INSERT INTO public.organizations (id, name, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000701',
  'Voorbeeldorganisatie Context Pack (FICTIEF)',
  'routeai'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  plan_type = EXCLUDED.plan_type,
  updated_at = now();

WITH core_course AS (
  SELECT id
  FROM public.learning_courses
  WHERE course_code = 'ai-literacy-foundation'
    AND org_id IS NULL
  LIMIT 1
)
INSERT INTO public.learning_context_pack_releases (
  id,
  org_id,
  course_id,
  version,
  status,
  context_json
)
SELECT
  '00000000-0000-0000-0000-000000000711',
  '00000000-0000-0000-0000-000000000701',
  core_course.id,
  1,
  'published',
  jsonb_build_object(
    'organization', jsonb_build_object(
      'name', 'Voorbeeldorganisatie Context Pack (FICTIEF)',
      'sector', 'Zakelijke dienstverlening (fictief)'
    ),
    'approved_tools', jsonb_build_array(
      jsonb_build_object(
        'name', 'Voorbeeld Copilot Enterprise',
        'guidance', 'Alleen gebruiken met het beheerde organisatieaccount en binnen de afgesproken datagrenzen.'
      ),
      jsonb_build_object(
        'name', 'Voorbeeld Chat-assistent Intern',
        'guidance', 'Gebruik voor concepten en samenvattingen; een medewerker blijft verantwoordelijk voor de eindcontrole.'
      )
    ),
    'data_rules', jsonb_build_array(
      'Voer geen bijzondere persoonsgegevens, wachtwoorden of geheime sleutels in.',
      'Minimaliseer klant- en medewerkersgegevens en gebruik fictieve voorbeelden waar dat kan.',
      'Controleer vóór gebruik of de gekozen tool voor dit informatietype is goedgekeurd.'
    ),
    'policy_link', jsonb_build_object(
      'label', 'Fictief intern AI-beleid',
      'url', 'https://example.test/ai-beleid'
    ),
    'escalation_route', jsonb_build_object(
      'summary', 'Stop bij twijfel en leg de casus voor aan de aangewezen verantwoordelijke.',
      'steps', jsonb_build_array(
        'Sla de gebruikte invoer en relevante output veilig op.',
        'Beschrijf doel, betrokken data en mogelijke impact.',
        'Neem contact op met de AI-coördinator of privacycontactpersoon.'
      ),
      'contact_role', 'AI-coördinator (fictief)',
      'contact_email', 'ai-coordinator@example.test'
    ),
    'oversight_roles', jsonb_build_array(
      'Medewerker: controleert bron, output en passend gebruik.',
      'Teamlead: beoordeelt toepassingen met impact op klanten of medewerkers.',
      'Privacycontactpersoon: adviseert bij persoonsgegevens en datadeling.',
      'AI-coördinator: beheert de escalatieroute en goedgekeurde toepassingen.'
    ),
    'sector_case', jsonb_build_object(
      'title', 'Conceptadvies voor een fictieve klant',
      'description', 'Een adviseur wil een AI-tool een eerste concept laten maken. De adviseur verwijdert herleidbare klantgegevens, gebruikt alleen een goedgekeurde tool, controleert bronnen en laat het eindadvies door een bevoegde collega beoordelen.'
    ),
    'role_cases', jsonb_build_array(
      jsonb_build_object(
        'role', 'Adviseur',
        'title', 'Concepttekst met menselijke eindcontrole',
        'description', 'Gebruik AI voor structuur en taal, maar verifieer feiten en neem het professionele oordeel niet over.'
      ),
      jsonb_build_object(
        'role', 'Teamlead',
        'title', 'Nieuwe toepassing eerst laten beoordelen',
        'description', 'Escaleer voordat AI wordt ingezet voor selectie, beoordeling of andere beslissingen over personen.'
      )
    )
  )
FROM core_course
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  expected_context jsonb;
  actual_context jsonb;
BEGIN
  SELECT context_json
  INTO actual_context
  FROM public.learning_context_pack_releases
  WHERE id = '00000000-0000-0000-0000-000000000711';

  SELECT jsonb_build_object(
    'organization', jsonb_build_object(
      'name', 'Voorbeeldorganisatie Context Pack (FICTIEF)',
      'sector', 'Zakelijke dienstverlening (fictief)'
    ),
    'approved_tools', jsonb_build_array(
      jsonb_build_object('name', 'Voorbeeld Copilot Enterprise', 'guidance', 'Alleen gebruiken met het beheerde organisatieaccount en binnen de afgesproken datagrenzen.'),
      jsonb_build_object('name', 'Voorbeeld Chat-assistent Intern', 'guidance', 'Gebruik voor concepten en samenvattingen; een medewerker blijft verantwoordelijk voor de eindcontrole.')
    ),
    'data_rules', jsonb_build_array(
      'Voer geen bijzondere persoonsgegevens, wachtwoorden of geheime sleutels in.',
      'Minimaliseer klant- en medewerkersgegevens en gebruik fictieve voorbeelden waar dat kan.',
      'Controleer vóór gebruik of de gekozen tool voor dit informatietype is goedgekeurd.'
    ),
    'policy_link', jsonb_build_object('label', 'Fictief intern AI-beleid', 'url', 'https://example.test/ai-beleid'),
    'escalation_route', jsonb_build_object(
      'summary', 'Stop bij twijfel en leg de casus voor aan de aangewezen verantwoordelijke.',
      'steps', jsonb_build_array(
        'Sla de gebruikte invoer en relevante output veilig op.',
        'Beschrijf doel, betrokken data en mogelijke impact.',
        'Neem contact op met de AI-coördinator of privacycontactpersoon.'
      ),
      'contact_role', 'AI-coördinator (fictief)',
      'contact_email', 'ai-coordinator@example.test'
    ),
    'oversight_roles', jsonb_build_array(
      'Medewerker: controleert bron, output en passend gebruik.',
      'Teamlead: beoordeelt toepassingen met impact op klanten of medewerkers.',
      'Privacycontactpersoon: adviseert bij persoonsgegevens en datadeling.',
      'AI-coördinator: beheert de escalatieroute en goedgekeurde toepassingen.'
    ),
    'sector_case', jsonb_build_object(
      'title', 'Conceptadvies voor een fictieve klant',
      'description', 'Een adviseur wil een AI-tool een eerste concept laten maken. De adviseur verwijdert herleidbare klantgegevens, gebruikt alleen een goedgekeurde tool, controleert bronnen en laat het eindadvies door een bevoegde collega beoordelen.'
    ),
    'role_cases', jsonb_build_array(
      jsonb_build_object('role', 'Adviseur', 'title', 'Concepttekst met menselijke eindcontrole', 'description', 'Gebruik AI voor structuur en taal, maar verifieer feiten en neem het professionele oordeel niet over.'),
      jsonb_build_object('role', 'Teamlead', 'title', 'Nieuwe toepassing eerst laten beoordelen', 'description', 'Escaleer voordat AI wordt ingezet voor selectie, beoordeling of andere beslissingen over personen.')
    )
  ) INTO expected_context;

  IF actual_context IS DISTINCT FROM expected_context THEN
    RAISE EXCEPTION 'Pilot Context Pack version 1 already exists with different content; publish a new version instead of mutating it';
  END IF;
END;
$$;

INSERT INTO public.learning_catalog (
  org_id,
  course_id,
  is_enabled,
  is_mandatory,
  active_context_pack_id
)
SELECT
  '00000000-0000-0000-0000-000000000701',
  course.id,
  true,
  true,
  '00000000-0000-0000-0000-000000000711'
FROM public.learning_courses course
WHERE course.course_code = 'ai-literacy-foundation'
  AND course.org_id IS NULL
ON CONFLICT (org_id, course_id) WHERE course_id IS NOT NULL
DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  is_mandatory = EXCLUDED.is_mandatory,
  active_context_pack_id = EXCLUDED.active_context_pack_id,
  updated_at = now();
