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

- Branch `codex/sai-production-readiness` is the active production-readiness
  hardening branch.
- `docs/sai-production-readiness-audit.md` is intentionally left untracked until
  a fresh, current review document is needed.
- Last documented green app checks remain:
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

## 2026-07-09 Local Readiness Evidence

Local validation was completed against the developer Supabase stack and the SAI
Next.js app on `127.0.0.1:3000`. This is release evidence for the local phase
only; it is not staging or production approval.

Validated locally:

- `supabase/seed/20260708130000_sai_synthetic_pilot_org_fixture.sql` was loaded
  into local Supabase as an opt-in fixture.
- `corepack pnpm --dir apps/sai seed:synthetic-flow --scenario all` completed
  as a dry run and reported 53 planned `survey_run` rows.
- The synthetic flow runner then wrote 53 completed responses through the real
  respondent RPC flow with explicit local opt-in (`--target local --confirm`).
- Dashboard routes loaded as a local DPO user:
  - `/dashboard/activatie`
  - `/dashboard/tools`
  - `/dashboard/risicoprofiel`
  - `/dashboard/governance`
  - `/dashboard/rapportage`
  - `/dashboard/voortgang`
- `/dev/auth` confirmed an authenticated DPO session linked to
  `SAI Synthetic Pilot Organisatie`
  (`00000000-0000-0000-0000-000000000301`).
- `/dashboard/activatie` showed 53 started runs, 53 completed runs, and the
  synthetic organization context.
- The local RLS role matrix smoke test passed with DPO, org-admin, regular-user,
  and super-admin test identities: `RLS role matrix smoke passed`.
- The local magic-link/email flow passed through Supabase Mailpit/Inbucket:
  magic link requested from the app, local email received, callback completed,
  `/dev/auth` authenticated the DPO role, and dashboard access succeeded.

Explicit non-production confirmations:

- No production Supabase project was contacted.
- No production migrations, seeds, synthetic organizations, test users, or magic
  links were created.
- No service-role keys, tokens, or magic links were printed into the docs or
  release evidence.
- The synthetic organization and wave token remain local/staging-only testdata
  and are still disallowed in production by section 5.

## 2026-07-09 Staging Branch Rehearsal Evidence

Staging rehearsal was started after explicit approval for staging readiness
testing and no production actions. The rehearsal used the existing non-default
Supabase development branch `learning-system-staging-rehearsal`
(`gpptjkwxqxxdsjgwzhzl`), not the default/main project.

Validated on the staging branch:

- Core SAI tables and RPC functions exist:
  `organizations`, `scan_wave`, `survey_run`, `user_roles`,
  `start_survey_run(text)`, `complete_survey_run(uuid,text)`, and
  `calculate_v8_score(uuid)`.
- Local/staging-only readiness fixtures were applied to the branch:
  `SAI Smoke Test Organisatie`, `SAI Synthetic Pilot Organisatie`, the
  synthetic scan wave, and five synthetic tool-policy rows.
- A branch-only respondent RPC smoke completed through `SET ROLE anon` and the
  real RPC boundary: direct insert attempts failed, valid wave token started a
  run, save RPCs succeeded, invalid token failed, completion burned the token,
  direct `calculate_v8_score` execution was blocked, and the completed run
  produced `risk_result`, `risk_result_tool`, and a `score.calculated` audit
  event.
- The V8 scoring parity smoke passed on the branch and verified the proportional
  exposure formula plus additive automation/agentic boosts.
- The tenant visibility part of the RLS matrix passed: DPO and org-admin could
  read own-org dashboard rows, cross-org reads were denied, regular `user`
  could not read dashboard rows, and `super_admin` could read across orgs.
- Non-Supabase app checks passed:
  - `corepack pnpm --dir packages/domain test`
  - `corepack pnpm --dir apps/sai seed:synthetic-flow --scenario all`
    (dry-run only; 53 planned rows; no Supabase calls)
  - `corepack pnpm --dir apps/sai lint`
  - `corepack pnpm --dir apps/sai build`

Staging blockers found and resolved/classified:

- A hardening migration now removes accidental direct `anon`/`authenticated`
  table writes for the SAI survey tables. Respondents write only through the
  token-validated RPC flow; `authenticated` keeps the RLS-backed dashboard
  SELECT surface.
- Public reference tables now have RLS enabled and keep authenticated read plus
  super-admin-only write policies.
- Existing `SECURITY DEFINER` function grants are rebuilt as an explicit API
  allowlist. `anon` can execute only the respondent RPCs needed for the survey
  flow. Dashboard/RLS helpers and DPO/admin wrappers remain
  `authenticated`-only where they validate `auth.uid()` and org role context.
  Internal token/scoring helpers and the auth trigger are not directly callable
  by API roles.
- Learning-system `SECURITY DEFINER` functions that exist only on mixed
  development branches are not part of the SAI allowlist and fail closed unless
  a learning-system release migration grants them after its own review.
- `survey_run_ambassador_opt_in` is service-role/RPC-only for this release
  shape; direct API SELECT is not granted and the stale read policy is removed.
  Direct API deletion of `survey_run` rows is also not part of this release
  shape.
- The SAI `dpo_review_items` foreign-key advisor warnings are fixed with
  supporting indexes. Learning-system foreign-key advisor warnings were
  classified as outside the SAI release scope on this branch and should be
  handled before a learning-system release gate.
- The synthetic pilot fixture now has a runtime guard and refuses to load unless
  the SQL session sets `app.environment` to `local` or `staging`.

Post-hardening branch verification:

- Respondent RPC smoke via `anon` passed: direct table grants were absent, the
  real RPC flow still worked, invalid/burned tokens failed, and direct scoring
  execution remained blocked.
- V8 scoring parity smoke passed.
- Full RLS role matrix passed, including grant-layer checks for direct table
  writes and non-respondent `SECURITY DEFINER` exposure.
- Advisor-equivalent blocker query returned:
  - 0 reference tables without RLS out of 21 reference tables.
  - no direct `INSERT` grant on `survey_run` or `survey_tool` for `anon` or
    `authenticated`.
  - 0 non-respondent `SECURITY DEFINER` functions executable by `anon`.
  - 0 SAI `dpo_review_items` foreign-key index gaps.
- Non-Supabase app checks passed after hardening:
  - `corepack pnpm --dir packages/domain test`
  - `corepack pnpm --dir apps/sai lint`
  - `corepack pnpm --dir apps/sai build`
- Independent offline review of commit `9870c5a` found no critical or high
  findings and gave go for the next staging app checks. Follow-up hardening
  closed the review's cheap pre-production findings around learning-function
  grants, ambassador opt-in read posture, the local audit doc ignore rule, and
  the synthetic fixture guard.

Explicit non-production confirmations:

- No production Supabase project was mutated.
- No production migrations, seeds, synthetic organizations, test users, or magic
  links were created.
- No Supabase keys, service-role secrets, respondent submission tokens, or magic
  links were printed or documented.
- Full staging HTTP/browser validation was not completed because no staging app
  deployment/env was used and no publishable key was retrieved for the branch.

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

Manual go/no-go:

- Validate the actual Vercel Preview and Production env configuration against
  the intended Supabase project refs without printing secret values.
- Confirm Preview points to staging Supabase and Production points only to
  production Supabase.
- Confirm the production default wave token and dev-route flag remain empty or
  disabled before enabling the production deployment.
- Treat this as a manual release gate; do not infer approval from local build
  checks alone.

## 2. Migration Gate

Apply migrations in timestamp order on staging first:

```txt
20260504110000_v8_1_target_schema.sql
20260504115000_pgcrypto_compat_wrappers.sql
20260504119000_create_legacy_user_roles_dependency.sql
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

Status: future release scope until a real export generation path is approved.

Minimum production decision before enabling real exports:

- Decide supported formats: PDF, CSV, Excel.
- Decide whether exports are generated synchronously, by background job, or
  manually during pilot.
- Store export metadata in `report_exports`.
- Store private files outside public access.
- Record who requested the export, filters/scope, generated version, status,
  retention period, and suppressed small cells.
- Add an audit event for export requested/generated/downloaded where feasible.
- Do not claim production export readiness from the current `report_exports`
  metadata alone; it is a record-plane placeholder until storage, retrieval,
  retention, and audit behavior are implemented and tested.

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
- Implement and verify wave-scoped delta queries that compare the current wave
  to a specific previous wave.
- Verify Voortgang distinguishes current wave, previous wave, and unavailable
  deltas.
- Confirm small-cell suppression still applies across t=1/t=2 comparisons.
- Until wave-scoped delta queries exist, Voortgang must remain framed as
  current-wave/nulmeting state and must not claim "vs vorige ronde" or real
  longitudinal comparison.

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

Staging execution plan, not to be run without explicit approval:

1. Confirm Supabase project separation manually: Preview/staging project ref is
   distinct from production; Production points only to the production Supabase
   project.
2. Confirm Vercel env vars without printing values:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   optional legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN`, and `SAI_ENABLE_DEV_ROUTES`.
3. Apply the approved migration set to staging in timestamp order and capture
   the staging migration ledger.
4. Create staging-only Auth users for DPO, org-admin, regular-user, and
   super-admin; link them through `public.user_roles` as described in
   `docs/sai-rls-smoke-runbook.md`.
5. Apply the synthetic pilot fixture only to staging, never production, with
   `app.environment` set to `staging` before running
   `supabase/seed/20260708130000_sai_synthetic_pilot_org_fixture.sql`.
6. Run the synthetic flow against staging only after dry-run:
   `corepack pnpm --dir apps/sai seed:synthetic-flow --scenario all`, then
   `--target staging --confirm --i-know-this-is-staging` with the staging
   Supabase URL/key supplied through the expected frontend env vars or CLI
   flags.
7. Inspect staging dashboard routes as the staging DPO and verify the synthetic
   organization, outliers, DPO review items, small-cell behavior, and t=1-only
   Voortgang framing.
8. Run the guarded RLS role matrix smoke test through
   `supabase/smoke-tests/run-rls-role-matrix-smoke.sh` with
   `--i-know-this-is-staging`.
9. Test staging magic-link/email delivery and callback for at least the DPO
   role, confirming it returns to the intended dashboard URL.
10. Make a merge/go-no-go decision only after staging evidence is captured and
    production is confirmed free of synthetic orgs, smoke/mock seeds, test
    tokens, and enabled dev routes.

## 9. After First Real Pilot

Capture:

- Number of invited users, started runs, completed runs, and score rows.
- Open/in-review/dismissed DPO review items.
- Any auth deliverability failures.
- Any dashboard small-cell suppression edge cases.
- Any user-facing governance language that needs durable documentation in
  `docs/domain-decisions.md`.
