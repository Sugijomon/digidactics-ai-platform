# Supabase Staging Rehearsal Plan

Status: draft for staging rehearsal, do not use as a live deployment script.

This document captures the safe path from the integrated Git branch to the live
Supabase `main` database for the combined SAI and RAI Learning System.

## Current State

Repository:

- Integration branch: `codex/integrate-rai-learning-with-sai-main`
- Target branch: `main`
- Latest verified integration commit: `1b6d296 Stabilize RAI production build workers`
- Branch relation at last check: `0` commits behind `origin/main`, `48` commits ahead

Supabase project:

- Project ref: `cfloqagsqwtrtkxdikec`
- Project name in dashboard: `SAI & RAI database`
- Live branch/environment: `main / production`
- The temporary preview branch `learning-system-validation` has been deleted.

Live `public` schema currently contains the SAI/Shadow AI surface, including:

- `survey_run`
- `survey_profile`
- `survey_tool`
- `survey_tool_use_case`
- `survey_tool_use_case_context`
- `survey_data_type`
- `risk_result`
- `risk_result_tool`
- `dpo_review_items`
- `audit_events`
- `report_exports`

Live does not currently contain the `learning_*` tables.

## Hard Guards

Do not do these before staging is validated:

- Do not run `supabase db push` against live.
- Do not apply migrations manually to live.
- Do not run the Learning content sync against live.
- Do not overwrite live editor content.
- Do not repair the live migration ledger until the staged schema has been
  compared with the live SAI/Shadow AI surface.

## Live Migration Ledger Observed

The live Supabase migration ledger was observed read-only with these entries:

| Live version | Live name | Likely repo counterpart | Status |
| --- | --- | --- | --- |
| `20260504130841` | `v8_1_core_schema_baseline` | `20260504110000_v8_1_target_schema.sql` | Verify equivalence before repair |
| `20260504132623` | `v8_1_pgcrypto_compat_wrappers` | `20260504115000_pgcrypto_compat_wrappers.sql` | Verify equivalence before repair |
| `20260504134216` | `v8_1_rls_policies_v2_1_runtime` | `20260504120000_rls_policies_v2_1.sql` | Verify equivalence before repair |
| `20260504134401` | `v8_1_edge_rpcs` | `20260504130000_06_edge_rpcs.sql` | Verify equivalence before repair |
| `20260512030526` | `make_save_profile_partial` | `20260512100000_make_save_profile_partial.sql` | Verify equivalence before repair |
| `20260528065251` | `repair_v8_scoring_parity` | `20260528143000_repair_v8_scoring_parity.sql` | Verify equivalence before repair |

The timestamps and names do not match the repo files. This is why a naive live
push is unsafe: Supabase may try to rerun baseline migrations that are already
present under different ledger IDs.

## Repo Migration Chain

The integration branch contains these migrations in timestamp order:

```txt
20260504110000_v8_1_target_schema.sql
20260504115000_pgcrypto_compat_wrappers.sql
20260504120000_rls_policies_v2_1.sql
20260504130000_06_edge_rpcs.sql
20260507160000_learning_system_foundation.sql
20260508100000_learning_certification_access_gate.sql
20260508102000_learning_certification_issue_function_fix.sql
20260508123000_auth_profile_role_bootstrap.sql
20260510120000_learning_topics_pages.sql
20260510143000_aisa_ai_literacy_foundations_content.sql
20260511100000_learning_page_attempts.sql
20260512100000_make_save_profile_partial.sql
20260522100000_implement_v8_scoring.sql
20260522113000_harden_rpc_grants_and_user_roles_rls.sql
20260522123000_backfill_completed_v8_scores.sql
20260524110000_seed_code_context_references.sql
20260525120000_learning_lesson_files_bucket.sql
20260527090000_grant_user_roles_select_to_authenticated.sql
20260527093000_enable_dashboard_read_access.sql
20260528143000_repair_v8_scoring_parity.sql
20260529120000_learning_pilot_hardening.sql
```

## Rehearsal Procedure

Use a fresh staging Supabase project or an approved temporary staging branch.
Production data is not required for the first pass.

1. Apply all repo migrations to staging in timestamp order.
2. Run the SAI seed files:
   - `supabase/seed/20260504141000_sai_smoke_seed.sql`
   - `supabase/seed/20260527_sai_dashboard_mock_data.sql`
3. Run the SAI smoke test:
   - `supabase/smoke-tests/20260504140000_sai_rpc_smoke_tests.sql`
4. Verify the SAI/Shadow AI surface:
   - reference tables exist and have seed rows
   - `survey_run` can be completed through the RPC flow
   - `risk_result` and `risk_result_tool` are written by trusted scoring
   - direct anonymous table writes fail
   - DPO/admin reads still work through the expected role path
5. Verify the Learning schema:
   - `learning_courses`
   - `learning_topics`
   - `learning_pages`
   - `learning_page_attempts`
   - `learning_course_enrollments`
   - `learning_certifications`
   - `learning_access_requirements`
6. Sign in as a content editor and open:
   - `/learning/admin/content-audit`
7. Tick the explicit confirmation:
   - `Git is bron van waarheid; overschrijf live editorcontent.`
8. Run:
   - `Sync Literacy + Proficiency + Mastery`
9. Verify Learning content:
   - three core courses exist
   - page counts are non-zero per course
   - `routeai_usecase_check` requires the AI Literacy certification
   - AI Literacy evidence/certification checks pass only via server-trusted logic
10. Verify the app:
   - SAI dashboard still loads
   - RAI Learning catalog loads
   - AI Literacy can be opened by a learner
   - Content editor can open the audit page
   - No certificate issue button is exposed for Proficiency/Mastery until their
     required evidence blocks are implemented

## SQL Checks For Staging

```sql
select course_code, status
from public.learning_courses
order by course_code;

select capability_code, required_certification_code, validity_months
from public.learning_access_requirements
where capability_code = 'routeai_usecase_check';

select course_id, count(*) as page_count
from public.learning_pages
group by course_id
order by course_id;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'learning_%'
order by table_name;
```

For each pilot user:

```sql
select
  p.id,
  p.org_id as profile_org_id,
  public.get_user_org_id(p.id) as resolved_org_id,
  p.org_id = public.get_user_org_id(p.id) as matches
from public.profiles p
where p.id = '<pilot-user-id>';
```

## Live Deployment Preparation After Staging Passes

Only after the staging rehearsal passes:

1. Compare staging SAI/Shadow AI schema and functions against live.
2. Decide which live ledger entries are equivalent to repo migrations.
3. Prepare a migration repair plan for equivalent baseline entries.
4. Review the plan before running it.
5. Apply only the remaining migrations during a quiet window.
6. Run the Learning content sync once on live after migrations are present.
7. Re-run the SQL checks above against live.

## Known Non-Blocking Follow-Ups

- `learning_pages.content` is still learner-readable at the raw table layer if a
  learner calls the REST API directly. The app sanitizes answer keys; a future
  hardening pass can move learner reads behind a sanitized RPC or view.
- Proficiency and Mastery certification issuance should stay disabled until
  their required evidence blocks and rubrics are fully wired.
- The storage bucket migration should be rehearsed because hosted Supabase
  storage policies can fail if ownership differs.

