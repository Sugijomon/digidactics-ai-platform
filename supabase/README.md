# Supabase Validation Runbook

Status: ready for staging/local validation.

This folder contains the database layer for the Shadow AI Scan V8.1 migration.
Run this first on a local or staging Supabase database, not directly on
production.

## Migration Order

Apply migrations in timestamp order. The current SAI MVP migration set includes:

```txt
supabase/migrations/20260504110000_v8_1_target_schema.sql
supabase/migrations/20260504115000_pgcrypto_compat_wrappers.sql
supabase/migrations/20260504119000_create_legacy_user_roles_dependency.sql
supabase/migrations/20260504120000_rls_policies_v2_1.sql
supabase/migrations/20260504130000_06_edge_rpcs.sql
supabase/migrations/20260512100000_make_save_profile_partial.sql
supabase/migrations/20260522100000_implement_v8_scoring.sql
supabase/migrations/20260522113000_harden_rpc_grants_and_user_roles_rls.sql
supabase/migrations/20260522123000_backfill_completed_v8_scores.sql
supabase/migrations/20260524110000_seed_code_context_references.sql
supabase/migrations/20260527090000_grant_user_roles_select_to_authenticated.sql
supabase/migrations/20260527093000_enable_dashboard_read_access.sql
supabase/migrations/20260528143000_repair_v8_scoring_parity.sql
```

The early schema migration creates the V8.1 tables and the original scoring
stub. The later `20260522100000_implement_v8_scoring.sql` migration replaces
that stub with the implemented server-trusted V8.1 scoring function. The RLS
and hardening migrations close direct table writes, keep direct scoring blocked
for clients, and expose the token-based respondent lifecycle.

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
2. Apply all migration SQL files in timestamp order.
3. Run the reference/smoke seed SQL only on local or staging.
4. Run the smoke-test SQL.
5. Create or link at least one `dpo` dashboard user in `public.user_roles`.
6. Complete at least one survey through the Next.js UI or the RPC smoke test so
   `risk_result`, `risk_result_tool`, and `dpo_review_items` exist.
7. Only after all checks pass, connect the future Next.js frontend to this
   staging project.

Do not run `supabase/seed/20260527_sai_dashboard_mock_data.sql` against
production. It is deterministic dashboard inspection data for local/staging, not
customer data.

## RLS Role Matrix And Synthetic Pilot Organisatie

Two additional local/staging-only resources support production-readiness
validation beyond the deterministic smoke org above:

- `supabase/smoke-tests/20260708120000_rls_role_matrix_smoke.sql` proves the
  anon/DPO/org-admin/user/super-admin RLS role matrix. Run it through
  `supabase/smoke-tests/run-rls-role-matrix-smoke.sh` (refuses to run against
  a non-local host unless `--i-know-this-is-staging` is passed). Full setup
  steps, required test users, and required `psql` variables:
  [`docs/sai-rls-smoke-runbook.md`](../docs/sai-rls-smoke-runbook.md).
- `SAI Synthetic Pilot Organisatie`
  (`00000000-0000-0000-0000-000000000301`) is a larger, richer local/staging
  population for dashboard inspection, with deliberate outliers and clusters
  below `dashboard_min_cell_size`. Apply
  `supabase/seed/20260708130000_sai_synthetic_pilot_org_fixture.sql`, then use
  `corepack pnpm --dir apps/sai seed:synthetic-flow` to fill it through the
  real RPC flow. That script **defaults to a dry run** (prints the plan, no
  Supabase calls) and only writes data when both `--target local|staging` and
  `--confirm` are passed explicitly — see
  `apps/sai/scripts/synthetic-flow/README.md`. Design and exact expected
  scores:
  [`docs/sai-synthetic-pilot-organisatie.md`](../docs/sai-synthetic-pilot-organisatie.md)
  and
  [`docs/sai-synthetic-flow-testplan.md`](../docs/sai-synthetic-flow-testplan.md).

Neither of these may ever be created against a production Supabase project —
see `docs/sai-production-release-checklist.md` section 5.

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
