# SAI Production Release Checklist

Status: first production-hardening checklist, based on the 2026-07-08 repo
audit and updated for the Evidence Foundation information architecture.
Canonical references: `docs/architecture/evidence-foundation-principles.md` and
`docs/adr/architecture-decision-register.md`.

## Evidence Foundation Frame

Treat every release task as belonging to one of three planes:

- Record plane: the operational truth SAI needs now. This includes
  organizations, `user_roles`, scan waves, survey runs, survey answers, selected
  tools, persisted risk results, DPO review items, and `report_exports`
  metadata.
- Evidence plane: the proof layer that makes records auditable. This includes
  migrations, scoring config IDs, `engine_version`, policy snapshots,
  `score_breakdown`, `audit_events`, export history, version pinning, and the
  future evidence ledger.
- Future intelligence plane: RouteAI/RAI expansion. This includes richer
  longitudinal insights, agentic governance, AI-rijbewijs patterns for agents,
  policy workflows, model/tool governance, training pathways, and automation.

Pilot readiness means the record plane works end to end and the evidence plane
is strong enough to explain what happened, which version produced it, and who
reviewed it. Future intelligence remains roadmap unless a task explicitly moves
part of it into implementation.

Hard constraints:

- Do not merge PR #3 (`codex/integrate-rai-learning-with-sai-main`) without
  explicit permission.
- Do not merge `codex/evidence-foundation` without explicit permission.
- Do not run production Supabase migrations without an explicit go/no-go.
- Do not use naive `supabase db push` against production, because the production
  migration ledger can differ from the repo ledger.

## Current Local Baseline

- Branch `main` is aligned with `origin/main`.
- The only untracked local folder is `ewx-research-framework/`; keep it outside
  Git and outside release packaging.
- Last documented green checks remain:
  - `corepack pnpm --dir packages/domain test`
  - `corepack pnpm --dir apps/sai lint`
  - `corepack pnpm --dir apps/sai build`
- The app uses only public Supabase browser env vars at runtime:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` as legacy fallback
  - `NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN` as optional local/staging convenience
  - `SAI_ENABLE_DEV_ROUTES` as an explicit staging-only dev route gate
- No frontend path should receive `SUPABASE_SERVICE_ROLE_KEY`.

## 1. Supabase Project Separation

Required before production:

- Create or confirm separate Supabase projects for local, staging, and
  production.
- Configure Vercel Preview against staging, not production.
- Configure Vercel Production against the production Supabase project only after
  staging passes all gates.
- Keep staging and production Auth Site URL and Redirect URLs separate.
- Keep production free of smoke/mock organizations, smoke wave tokens, and
  dashboard mock score rows.

Plane check:

- Record plane: staging and production records live in separate Supabase
  projects.
- Evidence plane: each environment has a captured migration ledger, project ref,
  app deployment SHA, and scoring version.
- Future intelligence plane: no RouteAI/agentic roadmap tables are introduced
  as part of this SAI release.

Production env gate:

```txt
NEXT_PUBLIC_SUPABASE_URL=<production-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<production-publishable-key>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<empty unless legacy fallback is needed>
NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN=<empty by default>
SAI_ENABLE_DEV_ROUTES=<empty or false>
```

## 2. Migration Gate

Apply migrations in timestamp order on staging first:

```txt
20260504110000_v8_1_target_schema.sql
20260504115000_pgcrypto_compat_wrappers.sql
20260504120000_rls_policies_v2_1.sql
20260504130000_06_edge_rpcs.sql
20260512100000_make_save_profile_partial.sql
20260522100000_implement_v8_scoring.sql
20260522113000_harden_rpc_grants_and_user_roles_rls.sql
20260522123000_backfill_completed_v8_scores.sql
20260524110000_seed_code_context_references.sql
20260527090000_grant_user_roles_select_to_authenticated.sql
20260527093000_enable_dashboard_read_access.sql
20260528143000_repair_v8_scoring_parity.sql
```

Staging validation:

- Run `supabase/smoke-tests/20260504140000_sai_rpc_smoke_tests.sql`.
- Run `supabase/smoke-tests/20260528143000_v8_scoring_parity_smoke.sql`.
- Run `supabase/smoke-tests/20260708120000_rls_role_matrix_smoke.sql`
  against staging with explicit DPO, org-admin, regular-user, and super-admin
  test identities.
- Complete one browser survey run against staging.
- Confirm a completed run writes `risk_result`, `risk_result_tool`,
  `dpo_review_items`, and a `score.calculated` audit event.
- Re-run app checks against staging env:
  - `corepack pnpm --dir packages/domain test`
  - `corepack pnpm --dir apps/sai lint`
  - `corepack pnpm --dir apps/sai build`

Production migration rule:

- Apply only migrations and approved reference/runtime configuration.
- Compare the production Supabase migration ledger to the repo ledger before any
  production action.
- Prefer an explicit SQL apply plan over `db push` for production.
- Do not apply `supabase/seed/20260504141000_sai_smoke_seed.sql`.
- Do not apply `supabase/seed/20260527_sai_dashboard_mock_data.sql`.
- Do not create `SAI Smoke Test Organisatie` in production.

Plane check:

- Record plane: all required SAI tables and RPCs exist in staging before
  production.
- Evidence plane: migration application is logged with timestamp, operator,
  source commit, and post-migration smoke-test output.
- Future intelligence plane: any Evidence Foundation ledger tables are reviewed
  as a separate migration scope, not smuggled into SAI production readiness.

## 3. RLS And Security Audit Gate

The intended access shape is:

- Respondent: anonymous RPC-only writes through `start_survey_run`,
  `save_*`, `set_ambassador_optin`, `register_tool_discovery`, and
  `complete_survey_run`; no direct table writes.
- DPO: authenticated read/update access for own organization review data only.
- Org admin: same organization governance/admin access, where policies allow it.
- Platform admin: super-admin access for platform/reference administration.

Required checks:

- Verify anonymous direct inserts into `survey_run`, `survey_tool`, and survey
  child tables fail.
- Verify anonymous `calculate_v8_score` execution fails.
- Verify a valid wave token can start a run.
- Verify an invalid or burned submission token cannot write survey data.
- Verify DPO can read only its own organization dashboard data.
- Verify a DPO from another organization cannot read the smoke/test org.
- Verify `user` role accounts cannot access dashboard data.
- Verify super-admin behavior explicitly, not by assumption.
- Run Supabase advisors on staging and production after migration.

Known security debt to resolve before broad production:

- Several `SECURITY DEFINER` functions intentionally remain in `public` for the
  pilot RPC and scoring boundary. Keep this accepted only while grants are
  narrow and advisors are reviewed. Later hardening should move internal helpers
  or admin wrappers out of exposed public API surface where feasible.
- `report_exports.storage_path` exists as metadata, but the real private
  Storage bucket, signed URL path, export worker, and audit trail are not yet a
  production pipeline.
- `dpo_review_items` are reliable at run/trigger level, but tool-level linkage
  is partial. Full DPO workflow assignment may need `survey_tool_id` linkage or
  a child review-case table.

Plane check:

- Record plane: respondent, DPO, org-admin, and platform-admin access matches
  the role matrix.
- Evidence plane: RLS tests are captured as release evidence, not only observed
  manually.
- Future intelligence plane: agentic governance remains represented as
  `agentic_usage`/review triggers only.

## 4. Magic Link And Email Gate

Before inviting real pilot users:

- Configure Supabase Auth Site URL to the final production SAI domain.
- Configure exact production Redirect URLs, including `/auth/callback`.
- Keep wildcard Vercel preview redirects out of production once the final domain
  is stable.
- Configure custom SMTP/domain settings if using a branded sender.
- Verify SPF, DKIM, and DMARC for the sending domain.
- Test magic link login for:
  - DPO user
  - org-admin user if enabled
  - regular respondent/user account
  - invalid/expired link
- Confirm login returns to the intended `next` URL and never exposes service
  keys or respondent submission tokens.

Plane check:

- Record plane: authenticated users map to `user_roles` and the correct org.
- Evidence plane: login/deliverability test results are attached to the release
  notes or evidence ledger once available.
- Future intelligence plane: no broader identity/learning passport flow is added
  for the SAI pilot.

## 5. Testdata And Seed Gate

Allowed outside production:

- Reference seed data for local/staging survey and dashboard inspection.
- Smoke org, smoke wave token, and dashboard mock data.

Allowed in production:

- Approved reference/runtime configuration required by the survey and scoring
  engine.
- Real organizations, scan waves, DPO users, and pilot runs.

Not allowed in production:

- `SAI Smoke Test Organisatie`
- `sai-smoke-wave-token`
- `dashboard_mock_seed` rows
- deterministic fake survey runs, fake DPO items, or fake report export rows
- `SAI Synthetic Pilot Organisatie` (`00000000-0000-0000-0000-000000000301`)
  and `sai-synthetic-pilot-wave-token` — see
  `docs/sai-synthetic-pilot-organisatie.md`

Plane check:

- Record plane: production contains only real customer/pilot records.
- Evidence plane: production reference/runtime configuration is version-pinned
  to a migration, seed approval note, or release record.
- Future intelligence plane: no training/agent passport seed is introduced until
  RouteAI scope is active.

## 6. Report And Export Pipeline Gate

Minimum production decision before enabling real exports:

- Decide supported formats: PDF, CSV, Excel.
- Decide whether exports are generated synchronously, by background job, or
  manually during pilot.
- Store export metadata in `report_exports`.
- Store private files outside public access.
- Record who requested the export, filters/scope, generated version, status,
  retention period, and suppressed small cells.
- Add an audit event for export requested/generated/downloaded where feasible.

Plane check:

- Record plane: `report_exports` captures operational export state.
- Evidence plane: each export is reproducible from source records, score
  versions, filters, and generated artifact metadata.
- Future intelligence plane: automated governance recommendations based on
  exports remain roadmap.

## 7. Second Scan Round Gate

Before claiming Voortgang/t=2 production readiness:

- Create a second scan wave in staging.
- Complete enough t=2 runs to test longitudinal dashboard behavior.
- Verify Voortgang distinguishes current wave, previous wave, and unavailable
  deltas.
- Confirm small-cell suppression still applies across t=1/t=2 comparisons.

Plane check:

- Record plane: scan waves and survey runs support longitudinal grouping.
- Evidence plane: t=2 comparison logic can be traced back to wave IDs and score
  versions.
- Future intelligence plane: trend interpretation remains DPO/dashboard support,
  not an automated intervention engine.

## 8. Pilot Release Gate

Release only after these pass:

- One staging DPO user linked in `public.user_roles`.
- One staging browser E2E pilot run with two tools.
- Dashboard pages load against staging Supabase:
  - `/dashboard/activatie`
  - `/dashboard/tools`
  - `/dashboard/risicoprofiel`
  - `/dashboard/governance`
  - `/dashboard/rapportage`
  - `/dashboard/voortgang`
- Rapportage and Governance counts match persisted `risk_result` and
  `dpo_review_items`.
- `NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN` is empty in production or intentionally
  set to a production campaign token.
- `SAI_ENABLE_DEV_ROUTES` is empty or `false` in production, so `/dev/rpc` and
  `/dev/auth` return 404.
- No smoke/mock seed rows are present in production.
- A rollback note exists: which Vercel deployment to restore and which Supabase
  migration state was last known good.

## 9. After First Real Pilot

Capture:

- Number of invited users, started runs, completed runs, and score rows.
- Open/in-review/dismissed DPO review items.
- Any auth deliverability failures.
- Any dashboard small-cell suppression edge cases.
- Any user-facing governance language that needs durable documentation in
  `docs/domain-decisions.md`.
