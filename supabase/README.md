# Supabase Validation Runbook

Status: ready for staging/local validation.

This folder contains the database layer for the Shadow AI Scan V8.1 migration.
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

The early schema migration creates the V8.1 tables and the original scoring
stub. The later `20260522100000_implement_v8_scoring.sql` migration replaces
that stub with the implemented server-trusted V8.1 scoring function. The RLS
and hardening migrations close direct table writes, keep direct scoring blocked
for clients, and expose the token-based respondent lifecycle.

## Validation Files

```txt
supabase/seed/20260504141000_sai_smoke_seed.sql
supabase/smoke-tests/20260504140000_sai_rpc_smoke_tests.sql
```

The seed file creates a deterministic smoke-test organization, one active scan
wave, and the minimum reference rows needed for the smoke-test RPC calls.

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
psql "<local-db-url>" -f supabase/smoke-tests/20260504140000_sai_rpc_smoke_tests.sql
```

Use the DB URL from `supabase status`. Do not commit local database passwords.

## Staging Supabase Flow

Suggested staging flow:

1. Create or select a staging Supabase project.
2. Apply the three migration SQL files in order.
3. Run the seed SQL.
4. Run the smoke-test SQL.
5. Only after all checks pass, connect the future Next.js frontend to this
   staging project.

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
