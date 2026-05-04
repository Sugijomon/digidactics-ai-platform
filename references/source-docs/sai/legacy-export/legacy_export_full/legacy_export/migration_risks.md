# Migration Risks — Lovable legacy → V8.1

## 1. Velden die ontbreken voor V8.1

Geen kritieke input-gaten gedetecteerd op kolomniveau.


## 2. Oude velden — niet meer gebruiken

Volgens `LEGACY.md`:
- `shadow_survey_runs` (legacy V<8.1 run-tabel)
- `tool_discoveries` (legacy discovery-tabel — V8.1 gebruikt `tool_catalog_discovery`)
- `_legacy_tools_catalog` (oude org-tools catalog)
- legacy view: `legacy_survey_participation_view` (zie supabase config)

Niet migreren naar V8.1-doelschema; alleen historische data archiveren indien gewenst.

## 3. Velden met privacyrisico

| Tabel | Veld | Reden |
|---|---|---|
| `_legacy_tools_catalog` | `custom_display_name` | naam/email/adres-keyword |
| `assessments` | `tool_name_raw` | naam/email/adres-keyword |
| `model_typekaart_updates` | `field_name` | naam/email/adres-keyword |
| `model_typekaarten` | `display_name` | naam/email/adres-keyword |
| `organizations` | `bank_account` | directe PII |
| `organizations` | `bank_name` | naam/email/adres-keyword |
| `organizations` | `contact_email` | directe PII |
| `organizations` | `contact_phone` | directe PII |
| `organizations` | `name` | naam/email/adres-keyword |
| `organizations` | `street_address` | directe PII |
| `passport_identity` | `dpo_email` | naam/email/adres-keyword |
| `passport_identity` | `dpo_name` | naam/email/adres-keyword |
| `profiles` | `email` | directe PII |
| `profiles` | `full_name` | directe PII |
| `shadow_survey_runs` | `scoreboard_name_visible` | naam/email/adres-keyword |
| `survey_invite` | `display_name` | naam/email/adres-keyword |
| `survey_invite` | `email` | directe PII |
| `survey_run` | `ambassador_email` | directe PII |
| `survey_wave` | `wave_name` | naam/email/adres-keyword |
| `tool_catalog_discovery` | `normalized_tool_name` | naam/email/adres-keyword |
| `tool_catalog_discovery` | `raw_tool_name` | naam/email/adres-keyword |
| `tools_library` | `name` | naam/email/adres-keyword |

Aandachtspunten:
- `survey_run.ambassador_email` — opt-in PII, koppeling naar geanonimiseerde scan-resultaten breekt anonimiteitsbelofte als niet apart opgeslagen.
- `organizations` financiële velden (`bank_account`, `bank_name`, `street_address`) — bekend issue uit `CLAUDE.md`; kolom-level RLS via view in V8.1.
- Vrije-tekstvelden (`top_concern_other_text`, `future_usecases_text`, `motivation_other_text`, `raw_tool_name`) kunnen onbedoeld PII bevatten — server-side PII-filter aanbevolen.

## 4. Tabellen alleen als demo/seed bruikbaar

- `ref_account_type` (referentielijst, 4 rijen) — codes overnemen, niet als data migreren.
- `ref_ai_frequency` (referentielijst, 4 rijen) — codes overnemen, niet als data migreren.
- `ref_catalog_beheerstatus` (referentielijst, 5 rijen) — codes overnemen, niet als data migreren.
- `ref_context` (referentielijst, 11 rijen) — codes overnemen, niet als data migreren.
- `ref_data_type` (referentielijst, 13 rijen) — codes overnemen, niet als data migreren.
- `ref_department` (referentielijst, 8 rijen) — codes overnemen, niet als data migreren.
- `ref_eu_ai_act_flag` (referentielijst, 3 rijen) — codes overnemen, niet als data migreren.
- `ref_governance_flag` (referentielijst, 8 rijen) — codes overnemen, niet als data migreren.
- `ref_no_ai_reason` (referentielijst, 3 rijen) — codes overnemen, niet als data migreren.
- `ref_org_policy_status` (referentielijst, 5 rijen) — codes overnemen, niet als data migreren.
- `ref_review_trigger` (referentielijst, 8 rijen) — codes overnemen, niet als data migreren.
- `ref_use_case` (referentielijst, 17 rijen) — codes overnemen, niet als data migreren.

Daarnaast bevatten enkele non-ref tabellen alleen demo-rijen:
- `organizations` (3 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `profiles` (10 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `survey_run` (11 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `survey_tool` (26 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `survey_tool_use_case` (34 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `risk_result` (8 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `risk_result_tool` (19 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `tool_discoveries` (20 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `org_tools_catalog` (12 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `tools_library` (55 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `model_typekaarten` (19 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `learning_library` (4 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `courses` (4 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.
- `lessons` (15 rijen) — bevat naar verwachting demo/seed-data; valideren met inhoud.

## 5. Tabellen die waarschijnlijk gemigreerd kunnen worden

- `organizations` (3 rijen)
- `profiles` (10 rijen)
- `user_roles` (14 rijen)
- `survey_wave` (0 rijen)
- `survey_run` (11 rijen)
- `survey_profile` (11 rijen)
- `survey_motivation` (10 rijen)
- `survey_data_type` (14 rijen)
- `survey_top_concern` (4 rijen)
- `survey_support_need` (8 rijen)
- `survey_tool_preference_reason` (6 rijen)
- `survey_tool` (26 rijen)
- `survey_tool_use_case` (34 rijen)
- `survey_tool_use_case_context` (2 rijen)
- `survey_tool_use_case_flag` (0 rijen)
- `survey_tool_account` (19 rijen)
- `org_tool_policy` (0 rijen)
- `tool_catalog_discovery` (1 rijen)
- `scan_scoring_config` (0 rijen)
- `risk_result` (8 rijen)
- `risk_result_tool` (19 rijen)
- `admin_audit_log` (39 rijen)
- `tools_library` (55 rijen)
- `model_typekaarten` (19 rijen)

## 6. Algemene aandachtspunten

- **RLS-policies** (`meta_policies.tsv`, 248 entries) gebruiken security-definer functies (`get_user_org_id`, `is_org_admin`, `is_dpo`, `is_super_admin`). In V8.1 hetzelfde patroon aanhouden om recursie te voorkomen.
- **Enum-types** (`meta_enums.tsv`) bevatten o.a. `app_role` met 6 rollen. Migreren als enum of lookup-tabel — kies vóór schema-creatie.
- **Triggers/functies**: scoring (`v8ScoreEngine.ts`) draait client-side in legacy. In V8.1 verplaatsen naar Edge Function of `pg_function` voor integriteit.
- **Snapshot-velden** (`org_policy_status_code_snapshot`, `eu_ai_act_flag_code_snapshot` op `survey_tool`) zijn essentieel voor reproduceerbare scoring — niet weggooien tijdens denormalisatie.
- **`survey_wave` is leeg** maar `survey_run.wave_id` bestaat — V8.1 `scan_rounds` is dus formeel niet in gebruik. Beslissen of legacy-runs één impliciete wave krijgen bij migratie.
- **Score-recalculatie** na migratie verplicht: legacy outputs zijn met oudere weights berekend.