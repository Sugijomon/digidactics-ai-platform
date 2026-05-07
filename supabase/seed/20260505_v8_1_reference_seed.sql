-- =============================================================================
-- Shadow AI Scan V8.1 - full respondent reference-data seed
-- =============================================================================
-- Run after the V8.1 schema migrations.
--
-- This file is intentionally seed-only:
-- - no schema changes
-- - no RLS changes
-- - no migration history changes
-- - idempotent INSERT ... ON CONFLICT statements only
--
-- Sources:
-- - references/source-docs/sai/methodology/SAI_V8_1_scoring_config.json
-- - references/source-docs/sai/survey/vragen-antwoorden-overzicht-V8.md
-- - references/source-docs/sai/methodology/Shadow_AI_Scan_Scoring_V8_1.md
-- - references/source-docs/sai/legacy-export/legacy_sample_data/sample_data/ref_*.json
-- - supabase/seed/20260504141000_sai_smoke_seed.sql
--
-- Notes:
-- - The target schema stores some methodology values as weights rather than
--   multipliers. Where the exact V8.1 multiplier has no dedicated column, the
--   value is represented as a trigger code and the nearest exposure/shadow
--   weight column is populated conservatively.
-- - Current smoke/dev aliases are preserved alongside canonical V8.1 codes:
--   customer_data, drafting, internal_work, personal_free.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profile reference data
-- -----------------------------------------------------------------------------

INSERT INTO public.ref_department (code, label_nl, label_en, sort_order, is_active)
VALUES
  ('it_data_development', 'IT, data en development', 'IT, data and development', 10, true),
  ('marketing_communicatie', 'Marketing en communicatie', 'Marketing and communications', 20, true),
  ('hr_recruitment', 'HR en recruitment', 'HR and recruitment', 30, true),
  ('finance_legal', 'Finance en legal', 'Finance and legal', 40, true),
  ('sales_account', 'Sales en accountmanagement', 'Sales and account management', 50, true),
  ('operations', 'Operations en support', 'Operations and support', 60, true),
  ('directie_management', 'Directie en management', 'Executive and management', 70, true),
  ('anders', 'Anders', 'Other', 80, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  label_en = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_ai_frequency (code, label_nl, weight, sort_order, is_active)
VALUES
  ('daily', 'Dagelijks', 15, 10, true),
  ('weekly', 'Wekelijks', 8, 20, true),
  ('monthly', 'Maandelijks', 0, 30, true),
  ('never', 'Ik gebruik momenteel geen AI-tools', 0, 40, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  weight = EXCLUDED.weight,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_no_ai_reason (code, label_nl, sort_order, is_active)
VALUES
  ('geen_waarde', 'Ik zie de toegevoegde waarde nog niet', 10, true),
  ('verboden', 'Het is expliciet verboden binnen mijn vakgebied', 20, true),
  ('weet_niet_hoe', 'Ik weet niet hoe ik moet beginnen', 30, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_motivation (code, label_nl, allows_other, sort_order, is_active)
VALUES
  ('tijdswinst', 'Tijdswinst - ik krijg mijn taken sneller af', false, 10, true),
  ('kwaliteitsverbetering', 'Kwaliteitsverbetering - output is beter, creatiever of foutlozer', false, 20, true),
  ('complexe_taken', 'Complexe taken - het helpt bij zaken die ik vrijwel niet zelf kan', false, 30, true),
  ('inspiratie_brainstormen', 'Inspiratie en brainstormen - over een leeg vel heen komen', false, 40, true),
  ('experimenteren', 'Experimenteren - ontdekken wat AI voor mijn rol kan betekenen', false, 50, true),
  ('anders', 'Anders', true, 60, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  allows_other = EXCLUDED.allows_other,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_data_awareness (code, label_nl, awareness_score, sort_order, is_active)
VALUES
  ('ja_controle', 'Ja, ik controleer voorwaarden over privacy en data-opslag', 30, 10, true),
  ('gedeeltelijk', 'Gedeeltelijk, ik weet dat data opgeslagen kan worden', 15, 20, true),
  ('nee_prive', 'Nee, ik ga ervan uit dat mijn gegevens prive blijven', 0, 30, true),
  ('nee_niet_verdiept', 'Nee, ik heb me hier nog niet in verdiept', 0, 40, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  awareness_score = EXCLUDED.awareness_score,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_anonymization (code, label_nl, hygiene_score, sort_order, is_active)
VALUES
  ('altijd', 'Ja, altijd', 30, 10, true),
  ('soms', 'Soms, als de informatie gevoelig is', 15, 20, true),
  ('nooit', 'Nee, ik voer de informatie direct in', 0, 30, true),
  ('wist_niet', 'Ik wist niet dat dit nodig of mogelijk was', 0, 40, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  hygiene_score = EXCLUDED.hygiene_score,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_browser_extension (code, label_nl, exposure_weight, sort_order, is_active)
VALUES
  ('ja_bewust', 'Ja, ik gebruik deze bewust', 10, 10, true),
  ('ja_onzeker', 'Ik heb ze geinstalleerd, maar weet niet zeker of ze meekijken', 10, 20, true),
  ('nee', 'Nee, ik gebruik geen AI-extensies', 0, 30, true),
  ('weet_niet', 'Ik weet niet precies wat dit zijn', 5, 40, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  exposure_weight = EXCLUDED.exposure_weight,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_automation_usage (code, label_nl, agentic_flag, sort_order, is_active)
VALUES
  ('alleen_chatbot', 'Nee, ik gebruik AI alleen als chatbot', false, 10, true),
  ('agents_reeks_taken', 'Ja, ik experimenteer met agents die zelfstandig een reeks taken uitvoeren', true, 20, true),
  ('gekoppeld_apps', 'Ja, ik heb AI gekoppeld aan andere apps', true, 30, true),
  ('weet_niet_zeker', 'Ik weet niet zeker of mijn tools zelfstandig werken', true, 40, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  agentic_flag = EXCLUDED.agentic_flag,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_policy_awareness (code, label_nl, sort_order, is_active)
VALUES
  ('ja_goed', 'Ja, ik weet goed wat er wel en niet mag', 10, true),
  ('vaag', 'Vaag bekend, ik heb er iets over gehoord', 20, true),
  ('nee', 'Nee, ik weet niet of er afspraken zijn', 30, true),
  ('geen_beleid', 'Voor zover ik weet is er nog geen beleid', 40, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_skill_level (code, label_nl, sort_order, is_active)
VALUES
  ('beginner', 'Beginner', 10, true),
  ('gemiddeld', 'Gemiddeld', 20, true),
  ('gevorderd', 'Gevorderd', 30, true),
  ('expert', 'Expert', 40, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_processing_output (code, label_nl, sort_order, is_active)
VALUES
  ('direct_overnemen', 'Ik neem de resultaten meestal direct over', 10, true),
  ('controle_handmatig', 'Ik controleer feiten en informatie handmatig', 20, true),
  ('ruwe_opzet', 'Ik gebruik output als ruwe opzet of inspiratie', 30, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- Tool-use reference data
-- -----------------------------------------------------------------------------

INSERT INTO public.ref_use_case (
  code,
  label_nl,
  ai_act_archetype,
  trigger_codes,
  sort_order,
  is_active
)
VALUES
  ('drafting', 'Teksten schrijven', 'productivity', ARRAY['use_case_base_low']::text[], 10, true),
  ('teksten_schrijven', 'Teksten schrijven of bewerken', 'productivity', ARRAY['use_case_base_low']::text[], 11, true),
  ('samenvatten_redigeren', 'Samenvatten en redigeren', 'productivity', ARRAY['use_case_base_low']::text[], 20, true),
  ('brainstormen', 'Brainstormen', 'productivity', ARRAY['use_case_base_low']::text[], 30, true),
  ('informatie_opzoeken', 'Informatie opzoeken', 'productivity', ARRAY['use_case_base_low']::text[], 40, true),
  ('vertalen', 'Vertalen', 'productivity', ARRAY['use_case_base_low']::text[], 50, true),
  ('klantenservice', 'Klantenservice', 'customer_interaction', ARRAY['use_case_base_medium']::text[], 60, true),
  ('data_analyseren', 'Data analyseren', 'analytics', ARRAY['use_case_base_medium']::text[], 70, true),
  ('code_schrijven', 'Code schrijven', 'software', ARRAY['use_case_base_medium']::text[], 80, true),
  ('afbeeldingen_genereren', 'Afbeeldingen genereren', 'media_generation', ARRAY['use_case_base_medium']::text[], 90, true),
  ('presentaties_design', 'Presentaties en design', 'productivity', ARRAY['use_case_base_low']::text[], 100, true),
  ('automatisering', 'Automatisering', 'automation', ARRAY['use_case_base_high', 'automation_flag']::text[], 110, true),
  ('audio_genereren', 'Audio genereren', 'media_generation', ARRAY['use_case_base_medium']::text[], 120, true),
  ('video_genereren', 'Video genereren', 'media_generation', ARRAY['use_case_base_medium']::text[], 130, true),
  ('vergaderingen_notuleren', 'Vergaderingen notuleren', 'productivity', ARRAY['use_case_base_medium']::text[], 140, true),
  ('workflow_uitvoeren', 'Workflows uitvoeren', 'agentic_workflow', ARRAY['use_case_base_high', 'agentic_usage']::text[], 150, true),
  ('systemen_aansturen', 'Systemen aansturen', 'agentic_workflow', ARRAY['use_case_base_high', 'agentic_usage']::text[], 160, true),
  ('taken_automatisch_afhandelen', 'Taken automatisch afhandelen', 'agentic_workflow', ARRAY['use_case_base_high', 'agentic_usage']::text[], 170, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  ai_act_archetype = EXCLUDED.ai_act_archetype,
  trigger_codes = EXCLUDED.trigger_codes,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

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
  ('internal_work', 'Intern werk', 5, 0, ARRAY['context_multiplier_1_0']::text[], 10, true),
  ('intern_gebruik', 'Intern gebruik', 5, 0, ARRAY['context_multiplier_1_0']::text[], 11, true),
  ('klantgerichte_toepassing', 'Klantgerichte toepassing', 10, 0, ARRAY['context_multiplier_1_25']::text[], 20, true),
  ('beslisondersteuning', 'Beslisondersteuning', 15, 5, ARRAY['context_multiplier_1_4']::text[], 30, true),
  ('besluiten_over_personen', 'Besluiten over personen', 25, 10, ARRAY['context_multiplier_1_6', 'human_impact']::text[], 40, true),
  ('hr_evaluatie', 'HR en evaluatie', 30, 15, ARRAY['context_multiplier_1_8', 'hr_evaluation']::text[], 50, true),
  ('kritieke_systemen', 'Kritieke systemen', 35, 20, ARRAY['context_multiplier_2_0', 'critical_systems']::text[], 60, true),
  ('nog_niet_duidelijk', 'Nog niet duidelijk', 10, 5, ARRAY['context_uncertain']::text[], 70, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  exposure_weight = EXCLUDED.exposure_weight,
  shadow_weight = EXCLUDED.shadow_weight,
  trigger_codes = EXCLUDED.trigger_codes,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_account_type (
  code,
  label_nl,
  is_personal,
  shadow_weight,
  sort_order,
  is_active
)
VALUES
  ('business_license', 'Zakelijke licentie', false, 0, 10, true),
  ('zakelijke_licentie', 'Zakelijke licentie', false, 0, 11, true),
  ('personal_free', 'Persoonlijk gratis account', true, 20, 20, true),
  ('prive_gratis', 'Priveaccount - gratis', true, 20, 21, true),
  ('personal_paid', 'Persoonlijk betaald account', true, 30, 30, true),
  ('prive_betaald', 'Priveaccount - betaald', true, 30, 31, true),
  ('both', 'Beide', true, 30, 40, true),
  ('beide', 'Beide', true, 30, 41, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  is_personal = EXCLUDED.is_personal,
  shadow_weight = EXCLUDED.shadow_weight,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- Data, concern, support, and preference reference data
-- -----------------------------------------------------------------------------

INSERT INTO public.ref_data_type (
  code,
  label_nl,
  is_special_category,
  is_business_confidential,
  exposure_weight,
  sort_order,
  is_active
)
VALUES
  ('public_information', 'Publieke informatie', false, false, 0, 10, true),
  ('publiek', 'Publieke informatie', false, false, 0, 11, true),
  ('names', 'Namen van personen', false, false, 15, 20, true),
  ('namen', 'Namen van personen', false, false, 15, 21, true),
  ('internal_emails', 'Interne e-mails', false, true, 15, 30, true),
  ('interne_email', 'Interne e-mails', false, true, 15, 31, true),
  ('internal_documents', 'Interne documenten', false, true, 15, 40, true),
  ('interne_documenten', 'Interne documenten', false, true, 15, 41, true),
  ('meeting_notes', 'Notulen van vergaderingen', false, true, 15, 50, true),
  ('notulen', 'Notulen of verslagen', false, true, 15, 51, true),
  ('source_code_logic', 'Broncode en logica', false, true, 15, 60, true),
  ('broncode_logica', 'Broncode of bedrijfslogica', false, true, 15, 61, true),
  ('customer_data', 'Klantgegevens', false, true, 20, 70, true),
  ('klantdata', 'Klantgegevens', false, true, 20, 71, true),
  ('financial_data', 'Financiele data', false, true, 30, 80, true),
  ('financiele_data', 'Financiele gegevens', false, true, 30, 81, true),
  ('special_personal_data', 'Gevoelige persoonsgegevens', true, false, 30, 90, true),
  ('gevoelig_persoonsgegeven', 'Bijzondere persoonsgegevens', true, false, 30, 91, true),
  ('excel_sheets', 'Excel sheets', false, true, 15, 100, true),
  ('legal_documents', 'Juridische documenten', false, true, 30, 110, true),
  ('juridische_documenten', 'Juridische documenten', false, true, 30, 111, true),
  ('none', 'Ik voer dit niet in', false, false, 0, 120, true),
  ('niets', 'Geen persoonsgegevens of vertrouwelijke data', false, false, 0, 121, true),
  ('unsure', 'Weet ik niet zeker', false, false, 15, 130, true),
  ('onzeker', 'Weet ik niet zeker', false, false, 15, 131, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  is_special_category = EXCLUDED.is_special_category,
  is_business_confidential = EXCLUDED.is_business_confidential,
  exposure_weight = EXCLUDED.exposure_weight,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_top_concern (code, label_nl, allows_other, sort_order, is_active)
VALUES
  ('learning_curve', 'Leercurve - het kost te veel tijd om het goed te leren', false, 10, true),
  ('accuracy', 'Accuratesse - ik vertrouw de uitkomsten niet altijd', false, 20, true),
  ('costs', 'Kosten - ik wil geen privegeld uitgeven aan zakelijke tools', false, 30, true),
  ('privacy', 'Privacy en persoonsgegevens', false, 40, true),
  ('privacy_security', 'Privacy en security - ik weet niet of mijn data veilig is', false, 41, true),
  ('no_major_concerns', 'Geen bijzondere zorgen', false, 50, true),
  ('other', 'Anders', true, 60, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  allows_other = EXCLUDED.allows_other,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_support_need (code, label_nl, sort_order, is_active)
VALUES
  ('clear_policy', 'Duidelijk beleid', 10, true),
  ('inspiration_examples', 'Inspiratie en voorbeelden', 20, true),
  ('training', 'Opleiding en training', 30, true),
  ('practice_together', 'Samen oefenen', 40, true),
  ('official_licenses', 'Officiele licenties', 50, true),
  ('technical_advice', 'Technisch advies', 60, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_preference_reason (code, label_nl, sort_order, is_active)
VALUES
  ('speed', 'Snelheid - het werkt sneller dan de huidige officiele alternatieven', 10, true),
  ('functionality', 'Functionaliteit - de tool kan dingen die andere software niet kan', 20, true),
  ('quality', 'Kwaliteit - ik vind de resultaten beter', 30, true),
  ('ease_of_use', 'Gebruiksgemak', 40, true),
  ('collaboration', 'Samenwerking - collega''s of partners gebruiken deze tool ook', 50, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- Policy, catalog, and EU AI Act reference data
-- -----------------------------------------------------------------------------

INSERT INTO public.ref_catalog_beheerstatus (code, label_nl, sort_order, is_active)
VALUES
  ('approved', 'Goedgekeurd', 10, true),
  ('known_unconfigured', 'Bekend, niet geconfigureerd', 20, true),
  ('under_review', 'In beoordeling', 30, true),
  ('newly_discovered', 'Nieuw ontdekt', 40, true),
  ('unknown', 'Onbekend', 50, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_org_policy_status (code, label_nl, sort_order, is_active)
VALUES
  ('approved', 'Toegestaan', 10, true),
  ('newly_discovered', 'Nieuw ontdekt', 20, true),
  ('under_review', 'Onder beoordeling', 30, true),
  ('restricted', 'Beperkt toegestaan', 40, true),
  ('prohibited', 'Niet toegestaan', 50, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.ref_eu_ai_act_flag (code, label_nl, sort_order, is_active)
VALUES
  ('none', 'Geen indicatie', 10, true),
  ('potential_high_risk', 'Potentieel hoog risico (Annex III)', 20, true),
  ('potential_article5_issue', 'Potentieel verboden toepassing (Artikel 5)', 30, true)
ON CONFLICT (code) DO UPDATE SET
  label_nl = EXCLUDED.label_nl,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
