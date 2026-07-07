# Supabase staging rehearsal - RAI Learning + SAI

Date: 2026-07-07  
Staging project ref: `gpptjkwxqxxdsjgwzhzl`  
Production project ref: `cfloqagsqwtrtkxdikec`  
Supabase branch: `learning-system-staging-rehearsal` (`596fe409-40f2-4cf0-8664-347fe29ffdfe`)  
Parent: `cfloqagsqwtrtkxdikec`

## Guardrails

- PR #3 was not merged.
- Production Supabase main was not migrated.
- No live content sync was run.
- No naive `supabase db push` was run against production.
- All write operations in this rehearsal were executed on staging project `gpptjkwxqxxdsjgwzhzl`.
- Production project `cfloqagsqwtrtkxdikec` was treated as read-only context.

## Docs inspected

- `docs/supabase-staging-rehearsal.md`
- `supabase/README.md`
- Relevant migrations under `supabase/migrations`
- Relevant Learning admin/content sync code under `apps/rai`

## Initial staging ledger

The staging branch inherited the live-style SAI/V8 ledger:

- `20260504130841 v8_1_core_schema_baseline`
- `20260504132623 v8_1_pgcrypto_compat_wrappers`
- `20260504134216 v8_1_rls_policies_v2_1_runtime`
- `20260504134401 v8_1_edge_rpcs`
- `20260512030526 make_save_profile_partial`
- `20260528065251 repair_v8_scoring_parity`

This confirms the known drift: repo migration timestamps do not match the live/staging ledger for SAI/V8. A direct live `supabase db push` remains unsafe.

## Staging migrations applied

Because the Supabase CLI was not available in the workspace, migrations were applied through the Supabase connector. The connector records generated timestamps in `supabase_migrations.schema_migrations`; therefore this rehearsal validates ordering, SQL behavior, dependencies, and repair needs, but it is not a byte-for-byte CLI ledger simulation.

Applied to staging only:

- `learning_system_foundation`
- `learning_certification_access_gate`
- `learning_certification_issue_function_fix`
- `auth_profile_role_bootstrap`
- `learning_topics_pages`
- `learning_page_attempts`
- `backfill_completed_v8_scores`
- `seed_code_context_references`
- `learning_lesson_files_bucket`
- `grant_user_roles_select_to_authenticated`
- `harden_rpc_grants_and_user_roles_rls`
- `enable_dashboard_read_access`
- `learning_pilot_hardening`
- `repair_learning_certification_status_ambiguity`

Skipped as already equivalent or superseded by inherited live ledger:

- `20260504110000_v8_1_target_schema.sql`
- `20260504115000_pgcrypto_compat_wrappers.sql`
- `20260504120000_rls_policies_v2_1.sql`
- `20260504130000_06_edge_rpcs.sql`
- `20260512100000_make_save_profile_partial.sql`
- `20260522100000_implement_v8_scoring.sql`
- `20260528143000_repair_v8_scoring_parity.sql`

Content note: full Git-canonical course page content was not synced yet. The staging database currently has schema and seed/bootstrap content, with AI Literacy placeholder/seed pages present and Proficiency/Mastery courses present but not populated with full page content.

## Required local code fixes found by rehearsal

Two migration hardening fixes are now present in the worktree and should be committed/pushed before PR #3 is considered ready:

1. `supabase/migrations/20260522113000_harden_rpc_grants_and_user_roles_rls.sql`
   - `public.rls_auto_enable()` is absent on the live-derived staging DB.
   - The migration now guards the `REVOKE` with `to_regprocedure(...)`.

2. `supabase/migrations/20260529120000_learning_pilot_hardening.sql`
   - `learning_issue_certification_for_enrollment` failed with `column reference "status" is ambiguous`.
   - The migration now qualifies the page status predicate as `learning_pages.status = 'published'`.
   - Staging received a connector repair migration named `repair_learning_certification_status_ambiguity`.

## Learning verification

Executed compact verification queries on staging.

Results:

- `learning_*` tables: 14
- Tables present:
  - `learning_access_requirements`
  - `learning_catalog`
  - `learning_certifications`
  - `learning_course_enrollments`
  - `learning_course_lessons`
  - `learning_courses`
  - `learning_lesson_attempts`
  - `learning_lesson_progress`
  - `learning_lessons`
  - `learning_page_attempts`
  - `learning_page_progress`
  - `learning_pages`
  - `learning_recommendation_rules`
  - `learning_topics`
- Learning functions present: 6
  - `learning_block_answer_is_correct`
  - `learning_check_capability_access`
  - `learning_content_is_valid`
  - `learning_is_trusted_writer`
  - `learning_issue_certification_for_enrollment`
  - `learning_jsonb_text_array`
- Courses present:
  - `ai-literacy-foundation`, published, foundation, unlocks `routeai_usecase_check`
  - `ai-proficiency`, published, intermediate
  - `ai-mastery`, published, advanced
- Active access requirement:
  - `routeai_usecase_check -> ai_literacy_foundation`, validity 12 months
- Storage bucket:
  - `lesson-files`, public, file size limit `52428800`
- `user_roles` policies:
  - `user_roles_select_self_or_admin`
  - `user_roles_write_super_admin`

Learning access/certification checks:

- Before certification, `learning_check_capability_access('routeai_usecase_check')` returns `can_access=false`, `certification_status='missing'`, required course `ai-literacy-foundation`.
- Certification issue function no longer fails with SQL ambiguity after repair.
- Certification issue is blocked for an incomplete staging enrollment with the intended evidence/progress error: `Required learning page ... is not completed`.
- Certifications issued after guard test: 0.
- Proficiency/Mastery certifications issued: 0.

## SAI verification

Executed staging-only smoke seed equivalent for:

- test organization `00000000-0000-0000-0000-000000000101`
- active smoke wave `00000000-0000-0000-0000-000000000201`
- required reference values
- `chatgpt` tool library and org policy row
- minimal active scoring config for smoke completion

The psql smoke-test file uses `\gset` and psql variables, so it cannot be run literally through the Supabase SQL runner. Its checks were translated into a server-side SQL/DO smoke equivalent.

SAI smoke results:

- anon direct `survey_run` insert: blocked by RLS
- anon direct `survey_tool` insert: blocked by RLS
- anon token-based RPC flow: passed
- invalid token: rejected
- `complete_survey_run`: passed
- completed/burned token reuse: rejected
- anon direct `calculate_v8_score`: blocked
- final run verification: completed, token burned, 1 tool, 1 discovery item

Persisted result checks:

- `risk_result`: 1
- `risk_result_tool`: 1
- `audit_events`: 1
- `dpo_review_items`: 1 staging-only review item inserted for DPO/admin-read validation

DPO/admin-read checks:

- staging DPO user role inserted for `00000000-0000-0000-0000-00000000d090`
- `auth.uid()` simulation as authenticated DPO returned:
  - `is_dpo=true`
  - `is_org_admin_or_dpo_for(smoke_org)=true`
- authenticated DPO can read:
  - `risk_result`: 1
  - `risk_result_tool`: 1
  - `dpo_review_items`: 1
- `mv_risk_clusters` was refreshed.
- `dpo_risk_clusters_v2(smoke_org)` executed without authorization error and returned 0 rows because min-cell-size suppresses the single-row smoke dataset.

## Supabase advisors

Security advisors were run on staging after the rehearsal DDL.

Notable categories:

- Existing SAI reference tables have policies while RLS is disabled, and are also reported as RLS-disabled public tables.
- `public.learning_content_is_valid` is reported with mutable search path.
- Multiple intentional SECURITY DEFINER RPC functions are reported as executable by authenticated users, including SAI token-flow RPCs and Learning certification/access functions.

These advisor findings are not all new Learning regressions, but they must be triaged before a live migration window. The RLS/reference-table findings in particular should be reconciled with the intended public reference-data access model.

## RAI staging app/env preparation

Staging Supabase API URL:

- `https://gpptjkwxqxxdsjgwzhzl.supabase.co`

Publishable keys were retrieved from Supabase, but no service role key is available through the connector. The RAI content sync path requires a server-side privileged client for dev bypass:

- `RAI_DEV_CONTENT_EDITOR_BYPASS=true`
- `NEXT_PUBLIC_SUPABASE_URL=https://gpptjkwxqxxdsjgwzhzl.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<staging publishable key>`
- `SUPABASE_SERVICE_ROLE_KEY=<staging service role key, server-side only>`

Without `SUPABASE_SERVICE_ROLE_KEY`, `/learning/admin/content-audit` can be prepared but the Git-canonical overwrite sync cannot be completed reliably through the dev bypass.

Content sync status:

- Not executed.
- Reason: requires explicit UI/service-role step and a staging service role key.
- Current staging content state:
  - AI Literacy: 3 topics, 6 pages
  - AI Proficiency: 0 topics, 0 pages
  - AI Mastery: 0 topics, 0 pages

## Live migration preparation note

Production is not ready for direct migration yet.

Equivalent live/staging ledger entries:

- Live `v8_1_core_schema_baseline` appears equivalent to repo `20260504110000_v8_1_target_schema.sql`.
- Live `v8_1_pgcrypto_compat_wrappers` appears equivalent to repo `20260504115000_pgcrypto_compat_wrappers.sql`.
- Live `v8_1_rls_policies_v2_1_runtime` appears equivalent to repo `20260504120000_rls_policies_v2_1.sql`.
- Live `v8_1_edge_rpcs` appears equivalent to repo `20260504130000_06_edge_rpcs.sql`.
- Live `make_save_profile_partial` appears equivalent to repo `20260512100000_make_save_profile_partial.sql`.
- Live `repair_v8_scoring_parity` appears equivalent to repo `20260528143000_repair_v8_scoring_parity.sql`, and supersedes the earlier `20260522100000_implement_v8_scoring.sql` state.

Live migrations still needed after review:

- Learning schema and access/certification migrations.
- Learning page/topic/page-attempt migrations.
- Learning storage bucket migration.
- User role/dashboard read hardening migrations.
- Learning pilot hardening migration with the `learning_pages.status` fix.
- `harden_rpc_grants_and_user_roles_rls` with the guarded `rls_auto_enable()` revoke.

Proposed live repair strategy:

1. Commit and push the two migration safety fixes from this rehearsal.
2. Let PR #3 CI rerun and stay draft until user review.
3. Run a fresh staging branch or reset this branch for a clean final rehearsal if exact CLI timestamp behavior is required.
4. Prepare a live ledger repair plan that marks inherited SAI/V8 migrations as equivalent instead of replaying them.
5. Apply only missing Learning and hardening migrations to live during a quiet window.
6. Run SAI smoke checks on live read/write only after explicit approval for production validation.
7. Run Git-canonical Learning content sync on live exactly once after migrations, through `/learning/admin/content-audit`, with service role kept server-side.
8. Re-run Learning catalog/access/certification checks.

Actions that still require explicit user approval:

- Marking PR #3 ready for review.
- Merging PR #3.
- Any production Supabase migration.
- Any production content sync.
- Using a staging service role key to run the content sync through the RAI app.

## Open risks

- Full Git-canonical content sync has not yet been executed on staging.
- The connector-generated migration timestamps differ from repo timestamps, so the final live plan must not assume this staging ledger can be copied as-is.
- The full dashboard mock seed file was not executed literally through the connector because it is a large file and the connector has no "run SQL file" operation. The core SAI RPC/RLS/risk/DPO paths were validated with targeted staging SQL.
- Supabase advisors report existing RLS/reference-table findings that should be triaged before live migration.
- Raw `learning_pages.content` remains a post-pilot hardening topic; a sanitized RPC/view is still recommended before broader exposure.
