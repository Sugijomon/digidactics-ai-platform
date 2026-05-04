# Supabase Validation Runbook

Status: ready for staging/local validation.

This folder contains the database layer for the Shadow AI Scan V8.1 migration.
Run this first on a local or staging Supabase database, not directly on
production.

## Migration Order

Apply migrations in this order:

```txt
supabase/migrations/20260504110000_v8_1_target_schema.sql
supabase/migrations/20260504120000_rls_policies_v2_1.sql
supabase/migrations/20260504130000_06_edge_rpcs.sql
```

The schema migration creates the V8.1 tables and scoring skeleton. The RLS
migration closes direct table writes and exposes the token-based run lifecycle.
The RPC migration adds the respondent-facing `save_*` write layer.

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

## Known Current Limitation

`calculate_v8_score(uuid)` is still a skeleton in the target schema. The
`complete_survey_run(...)` RPC catches scoring errors and logs them, so the
respondent lifecycle can still be smoke-tested. Implementing the full scoring
engine is a separate next step before production.

## Expected Outcome

After validation, the database layer should be ready for the Next.js app
foundation:

- Supabase SSR auth foundation
- survey client that calls the RPC flow
- DPO/admin dashboard routes
- full scoring engine implementation
