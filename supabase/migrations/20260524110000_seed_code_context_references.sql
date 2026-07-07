-- Ensure code-tool context references exist for the SAI toolpicker.
-- Code tools save a canonical use case plus one or more context rows.

INSERT INTO public.ref_use_case (
  code,
  label_nl,
  ai_act_archetype,
  trigger_codes,
  sort_order,
  is_active
)
VALUES
  ('code_schrijven', 'Code schrijven', 'software_development', ARRAY[]::text[], 90, true)
ON CONFLICT (code) DO UPDATE
SET
  label_nl = EXCLUDED.label_nl,
  ai_act_archetype = COALESCE(public.ref_use_case.ai_act_archetype, EXCLUDED.ai_act_archetype),
  is_active = true;

INSERT INTO public.ref_context (
  code,
  label_nl,
  exposure_weight,
  shadow_weight,
  trigger_codes,
  sort_order,
  is_active
)
VALUES
  ('intern_gebruik', 'Intern gebruik', 1.00, 0.00, ARRAY[]::text[], 10, true),
  ('klantgerichte_toepassing', 'Klantgerichte toepassing', 1.20, 0.10, ARRAY[]::text[], 20, true),
  ('beslisondersteuning', 'Beslisondersteuning', 1.35, 0.20, ARRAY['human_review_required']::text[], 30, true),
  ('besluiten_over_personen', 'Besluiten over personen', 1.60, 0.35, ARRAY['human_review_required']::text[], 40, true),
  ('financieel_juridisch', 'Financieel en juridisch', 1.45, 0.25, ARRAY['human_review_required']::text[], 50, true),
  ('kritieke_systemen', 'Kritieke systemen', 1.80, 0.45, ARRAY['human_review_required']::text[], 60, true),
  ('nog_niet_duidelijk', 'Nog niet duidelijk', 1.15, 0.10, ARRAY['human_review_required']::text[], 70, true)
ON CONFLICT (code) DO UPDATE
SET
  label_nl = EXCLUDED.label_nl,
  exposure_weight = EXCLUDED.exposure_weight,
  shadow_weight = EXCLUDED.shadow_weight,
  trigger_codes = EXCLUDED.trigger_codes,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
