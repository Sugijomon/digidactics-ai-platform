# RAI live database readiness note

Datum: 2026-07-07
Project ref: `cfloqagsqwtrtkxdikec`
Methode: read-only Supabase connector SQL, omdat `supabase db diff` en `db dump` lokaal Docker vereisen.

## Kernbevinding

De live Supabase database bevat momenteel de Shadow AI / V8 / SAI basis, maar geen RAI Learning System tabellen of learning RPC's.

Dat bevestigt Fable's split-brain risico:

- `origin/main` bevat de SAI/V8 migraties die live grotendeels weerspiegeld lijken.
- `codex/rai-learning-pilot-hardening` bevat de RAI Learning System migraties en hardening.
- De live database representeert niet één complete Git-branch met zowel SAI als RAI Learning.

## Live database: zichtbaar in `public`

Learning ontbreekt:

- Geen `learning_courses`
- Geen `learning_topics`
- Geen `learning_pages`
- Geen `learning_page_attempts`
- Geen `learning_course_enrollments`
- Geen `learning_certifications`
- Geen `learning_access_requirements`

Wel aanwezig zijn onder andere:

- `organizations`
- `profiles`
- `user_roles`
- `survey_*`
- `ref_*`
- `risk_result`
- `risk_result_tool`
- `scan_scoring_config`
- `tool_catalog_discovery`
- `tools_library`
- `org_tool_policy`
- `report_exports`
- `audit_events`

## Live migration history

Live `supabase_migrations.schema_migrations` bevat:

- `20260504130841` - `v8_1_core_schema_baseline`
- `20260504132623` - `v8_1_pgcrypto_compat_wrappers`
- `20260504134216` - `v8_1_rls_policies_v2_1_runtime`
- `20260504134401` - `v8_1_edge_rpcs`
- `20260512030526` - `make_save_profile_partial`
- `20260528065251` - `repair_v8_scoring_parity`

## Branchverschil migrations

RAI hardening branch voegt toe t.o.v. `origin/main`:

- `20260507160000_learning_system_foundation.sql`
- `20260508100000_learning_certification_access_gate.sql`
- `20260508102000_learning_certification_issue_function_fix.sql`
- `20260508123000_auth_profile_role_bootstrap.sql`
- `20260510120000_learning_topics_pages.sql`
- `20260510143000_aisa_ai_literacy_foundations_content.sql`
- `20260511100000_learning_page_attempts.sql`
- `20260525120000_learning_lesson_files_bucket.sql`
- `20260529120000_learning_pilot_hardening.sql`

`origin/main` bevat SAI/V8 migrations die niet in de RAI hardening branch zitten:

- `20260512100000_make_save_profile_partial.sql`
- `20260522100000_implement_v8_scoring.sql`
- `20260522113000_harden_rpc_grants_and_user_roles_rls.sql`
- `20260522123000_backfill_completed_v8_scores.sql`
- `20260524110000_seed_code_context_references.sql`
- `20260527090000_grant_user_roles_select_to_authenticated.sql`
- `20260527093000_enable_dashboard_read_access.sql`
- `20260528143000_repair_v8_scoring_parity.sql`

## Aanbevolen vervolgstap

Niet direct learning migrations naar live pushen vanuit de RAI branch.

Eerst een integratiebranch maken waarin:

1. `origin/main` de basis blijft voor live SAI/V8.
2. RAI app + learning migrations uit `codex/rai-learning-pilot-hardening` worden toegevoegd.
3. Migration volgorde expliciet wordt gecontroleerd, vooral rond:
   - `profiles`
   - `user_roles`
   - `get_user_org_id`
   - `is_learning_admin_for`
   - storage bucket migration
   - learning certification RPC
4. Daarna pas een gecontroleerde deploy/migration naar live.

## Beste opties voor de komende sessie

1. Maak een integratiebranch `codex/integrate-rai-learning-with-sai-main`.
2. Merge/cherry-pick RAI learning system op `origin/main`.
3. Los app- en migration-conflicten lokaal op.
4. Draai TypeScript/parity tests.
5. Laat Fable deze integratiebranch reviewen, niet de losse RAI branch.

## Wat niet doen

- Niet `supabase db push` draaien vanaf de huidige RAI hardening branch.
- Niet Docker/WSL forceren als je nu door wilt met productwerk.
- Niet live DDL toepassen via SQL editor voordat de branches zijn geïntegreerd.
