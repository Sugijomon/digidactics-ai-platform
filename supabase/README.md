# Supabase Validation Runbook

Status: ready for staging/local validation.

This folder contains the database layer for the Shadow AI Scan V8.1 migration
and the RouteAI Learning System integration.
Run this first on a local or staging Supabase database, not directly on
production.

## Migration Order

Apply migrations in timestamp order. The current SAI MVP migration set includes:

```txt
supabase/migrations/20260504110000_v8_1_target_schema.sql
supabase/migrations/20260504120000_rls_policies_v2_1.sql
supabase/migrations/20260504130000_06_edge_rpcs.sql
supabase/migrations/20260512100000_make_save_profile_partial.sql
supabase/migrations/20260522100000_implement_v8_scoring.sql
supabase/migrations/20260522113000_harden_rpc_grants_and_user_roles_rls.sql
supabase/migrations/20260522123000_backfill_completed_v8_scores.sql
```

The current RAI Learning integration adds these migrations after the SAI/V8
foundation:

```txt
supabase/migrations/20260507160000_learning_system_foundation.sql
supabase/migrations/20260508100000_learning_certification_access_gate.sql
supabase/migrations/20260508102000_learning_certification_issue_function_fix.sql
supabase/migrations/20260508123000_auth_profile_role_bootstrap.sql
supabase/migrations/20260510120000_learning_topics_pages.sql
supabase/migrations/20260510143000_aisa_ai_literacy_foundations_content.sql
supabase/migrations/20260511100000_learning_page_attempts.sql
supabase/migrations/20260525120000_learning_lesson_files_bucket.sql
supabase/migrations/20260529120000_learning_pilot_hardening.sql
```

The early schema migration creates the V8.1 tables and the original scoring
stub. The later `20260522100000_implement_v8_scoring.sql` migration replaces
that stub with the implemented server-trusted V8.1 scoring function. The RLS
and hardening migrations close direct table writes, keep direct scoring blocked
for clients, and expose the token-based respondent lifecycle.

The learning migrations create the course/page/evidence model, the RouteAI
access requirement, certificate issuance RPC, and pilot hardening that blocks
learner-side grading/completion manipulation. The hardening migration seeds the
three core course rows and the `routeai_usecase_check` access requirement, but
the authored topics/pages are synced from Git after migration through the
content editor audit page.

## Validation Files

```txt
supabase/seed/20260504141000_sai_smoke_seed.sql
supabase/seed/20260527_sai_dashboard_mock_data.sql
supabase/smoke-tests/20260504140000_sai_rpc_smoke_tests.sql
```

The seed file creates a deterministic smoke-test organization, one active scan
wave, and the minimum reference rows needed for the smoke-test RPC calls.

`20260527_sai_dashboard_mock_data.sql` adds deterministic, persisted dashboard
inspection data for the same smoke-test organization: survey runs, profiles,
tools, account/use-case/context selections, V8 risk results, tool-level scores,
DPO review items, audit events, and a report export row. It is mock/test data in
the database, not hard-coded mock data in production dashboard components.

The deterministic organization is also the default local/staging dashboard
inspection org:

```txt
Organization: SAI Smoke Test Organisatie
org_id:       00000000-0000-0000-0000-000000000101
wave token:   sai-smoke-wave-token
```

To inspect the DPO dashboard with a real login, create a user in Supabase Auth
and link it to this organization:

```sql
insert into public.user_roles (user_id, org_id, role)
values (
  '<auth.users.id>',
  '00000000-0000-0000-0000-000000000101',
  'dpo'
);
```

Use persisted test rows in the V8 tables for dashboard mockup checks. Production
dashboard components should not contain hard-coded mock data.

The smoke-test file validates:

- direct anon table writes fail
- valid wave token starts a run
- valid submission token can write survey data through RPCs
- invalid token fails
- completion burns the submission token
- direct scoring remains blocked

## Local Supabase Flow

Suggested local flow:

```powershell
supabase start
supabase db reset
psql "<local-db-url>" -f supabase/seed/20260504141000_sai_smoke_seed.sql
psql "<local-db-url>" -f supabase/seed/20260527_sai_dashboard_mock_data.sql
psql "<local-db-url>" -f supabase/smoke-tests/20260504140000_sai_rpc_smoke_tests.sql
```

Use the DB URL from `supabase status`. Do not commit local database passwords.

## Staging Supabase Flow

Suggested staging flow:

1. Create or select a staging Supabase project.
2. Apply the three migration SQL files in order.
3. Run the seed SQL.
4. Run the smoke-test SQL.
5. Create or link at least one `dpo` dashboard user in `public.user_roles`.
6. Complete at least one survey through the Next.js UI or the RPC smoke test so
   `risk_result`, `risk_result_tool`, and `dpo_review_items` exist.
7. Only after all checks pass, connect the future Next.js frontend to this
   staging project.

## RouteAI Learning Post-Migration Step

After the learning migrations run, sign in as a content editor and open:

```txt
/learning/admin/content-audit
```

Tick the confirmation checkbox:

```txt
Git is bron van waarheid; overschrijf live editorcontent.
```

Then run:

```txt
Sync Literacy + Proficiency + Mastery
```

This step is required because the database migrations create the course rows
and access gate, while the full authored course pages are synced from the Git
source of truth. Verify afterwards:

```sql
select course_code, status from public.learning_courses order by course_code;
select capability_code, required_certification_code, validity_months
from public.learning_access_requirements
where capability_code = 'routeai_usecase_check';
select course_id, count(*) from public.learning_pages group by course_id;
```

For each pilot user, also verify that learning RLS resolves the same
organization as the profile row:

```sql
select
  p.id,
  p.org_id as profile_org_id,
  public.get_user_org_id(p.id) as resolved_org_id,
  p.org_id = public.get_user_org_id(p.id) as matches
from public.profiles p
where p.id = '<pilot-user-id>';
```

## Live Migration Ledger Warning

The current live project was observed with migration ledger versions that do
not match these repository filenames. Do not run a naive `supabase db push`
against live from this branch.

Before live deployment:

1. Apply the full chain on a fresh staging project.
2. Compare the SAI/V8 surface against live.
3. Mark the already-equivalent live baseline migrations as applied using
   `supabase migration repair --status applied` or an approved ledger repair
   procedure.
4. Push only the remaining migrations during a quiet window.
5. Run the RouteAI Learning content sync above.

## Current Scoring Status

`calculate_v8_score(uuid)` is implemented by
`20260522100000_implement_v8_scoring.sql`. `complete_survey_run(...)` calls it
after token validation, so completed runs persist `risk_result`,
`risk_result_tool`, `dpo_review_items`, and a `score.calculated` audit event.

The TypeScript engine in `packages/domain` remains the regression-testable
reference implementation for the same V8.1 rules. Keep both layers aligned when
changing score mappings, boosts, thresholds, triggers, or aggregation.

## Expected Outcome

After validation, the database layer should be ready for the Next.js app
foundation:

- Supabase SSR auth foundation
- survey client that calls the RPC flow
- DPO/admin dashboard routes
- implemented scoring engine and dashboard validation
