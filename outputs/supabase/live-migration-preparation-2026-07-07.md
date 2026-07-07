# Live Supabase migration preparation - PR #3

Date: 2026-07-07  
Production project ref: `cfloqagsqwtrtkxdikec`  
Staging project ref: `gpptjkwxqxxdsjgwzhzl`  
Staging branch: `learning-system-staging-rehearsal` (`596fe409-40f2-4cf0-8664-347fe29ffdfe`)  
PR branch: `codex/integrate-rai-learning-with-sai-main`

## Guardrails

- PR #3 was not merged.
- No production Supabase migration was run.
- No live migration repair was run.
- No `supabase db push` was run against production.
- No production Learning content sync was run.
- Production `cfloqagsqwtrtkxdikec` was inspected read-only.
- Staging `gpptjkwxqxxdsjgwzhzl` was inspected read-only in this preparation pass.

## Inputs inspected

- `docs/supabase-staging-rehearsal.md`
- `supabase/README.md`
- `outputs/supabase/staging-rehearsal-2026-07-07.md`
- `supabase/migrations/*.sql`
- Supabase migration ledgers for production and staging
- Read-only schema fingerprints for production and staging
- Supabase advisor output for production and staging

## Migration ledgers

Production ledger:

- `20260504130841 v8_1_core_schema_baseline`
- `20260504132623 v8_1_pgcrypto_compat_wrappers`
- `20260504134216 v8_1_rls_policies_v2_1_runtime`
- `20260504134401 v8_1_edge_rpcs`
- `20260512030526 make_save_profile_partial`
- `20260528065251 repair_v8_scoring_parity`

Staging ledger:

- The same six inherited SAI/V8 entries as production
- Connector-applied rehearsal entries for Learning, hardening, storage, dashboard read access, and the certification ambiguity repair

Important: staging migration timestamps are connector-generated, not repo filenames. This validates SQL behavior and dependency ordering, but does not validate exact `supabase db push` ledger mechanics.

## Read-only SAI schema diff

Scope used for the SAI surface:

- `public` relations excluding `learning_%`
- `public` functions excluding `learning_%`
- table columns, defaults, constraints, indexes, policies, RLS flags, and function definitions

High-level fingerprints:

| Surface | Production | Staging |
| --- | ---: | ---: |
| Non-learning public relations | 48 | 48 |
| Non-learning table structural digest | `f195325b8898c8f02383fe907c718671` | `f195325b8898c8f02383fe907c718671` |
| Non-learning functions | 41 | 47 |
| Combined digest | `4981fd3fa0665d11f846dd4eec22ecee` | `8bfdd4b9fd851e4414089ae0d5e9edaa` |

Interpretation:

- The SAI table structure is equivalent for the compared surface: same relation count and same columns/constraints/indexes digest.
- The current staging/live SAI surface is not byte-identical because staging includes later rehearsal migrations and differs on some security state.
- The difference is not a reason to change production now; it is a reason to keep the clean CLI rehearsal and live repair review as hard gates.

Notable SAI/security differences found:

- Production has RLS enabled on all 21 `ref_%` reference tables.
- Staging currently has RLS disabled on those 21 `ref_%` tables while retaining the same reference-table policies.
- Production has `public.rls_auto_enable()`, while staging does not.
- Staging has extra non-learning helper/protection functions from Learning/auth/hardening migrations:
  - `handle_new_auth_user()`
  - `is_learning_admin_for(uuid)`
  - `protect_learning_attempt_grading()`
  - `protect_learning_course_enrollment_completion()`
  - `protect_learning_page_attempt_grading()`
  - `try_parse_uuid(text)`
  - `validate_learning_lesson_content()`
- `get_user_org_id(uuid)` is semantically aligned between production and staging; the function hash differs due formatting/casing.

Read-only checks:

```sql
-- Production
select count(*) filter (where c.relname like 'ref_%' and c.relrowsecurity = false) as ref_tables_rls_disabled,
       count(*) filter (where c.relrowsecurity = false and c.relkind in ('r','p') and n.nspname='public') as public_tables_rls_disabled,
       count(*) filter (where c.relname like 'learning_%') as learning_tables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relkind in ('r','p');
```

Production result:

- `ref_tables_rls_disabled = 0`
- `public_tables_rls_disabled = 0`
- `learning_tables = 0`

Staging result:

- `ref_tables_rls_disabled = 21`
- `public_tables_rls_disabled = 21`
- `learning_tables = 14`

## Ledger equivalence assessment

These equivalences are acceptable as a planning hypothesis, not as permission to repair live:

| Production ledger entry | Repo migration | Assessment |
| --- | --- | --- |
| `20260504130841 v8_1_core_schema_baseline` | `20260504110000_v8_1_target_schema.sql` | Structurally equivalent for the current SAI relation surface; reference-table RLS state must be handled carefully because live is stricter than current staging. |
| `20260504132623 v8_1_pgcrypto_compat_wrappers` | `20260504115000_pgcrypto_compat_wrappers.sql` | Equivalent wrapper functions exist; no live action yet. |
| `20260504134216 v8_1_rls_policies_v2_1_runtime` | `20260504120000_rls_policies_v2_1.sql` | Policies/functions largely align, but production/staging RLS state differs on `ref_%`; do not repair blindly without a clean CLI rehearsal and explicit diff review. |
| `20260504134401 v8_1_edge_rpcs` | `20260504130000_06_edge_rpcs.sql` | Overlapping respondent RPC definitions match by hash. |
| `20260512030526 make_save_profile_partial` | `20260512100000_make_save_profile_partial.sql` | Treat as equivalent, subject to clean rehearsal confirmation. |
| `20260528065251 repair_v8_scoring_parity` | `20260528143000_repair_v8_scoring_parity.sql` | Production `calculate_v8_score` hash matches staging; treat as equivalent to the repaired V8 scoring state. |

Practical conclusion:

- A future live repair plan should mark the six live SAI/V8 ledger entries as equivalent only after the clean CLI rehearsal reproduces the intended skip/push behavior.
- The final plan must avoid replaying baseline SAI migrations against live.
- The final plan must preserve live's stricter `ref_%` RLS state unless a reviewed migration intentionally changes it.

## Migrations still needed on live

Production has no `learning_%` tables and no `lesson-files` storage bucket.

Remaining repo migrations that still need a live path after approval:

- `20260507160000_learning_system_foundation.sql`
- `20260508100000_learning_certification_access_gate.sql`
- `20260508102000_learning_certification_issue_function_fix.sql`
- `20260508123000_auth_profile_role_bootstrap.sql`
- `20260510120000_learning_topics_pages.sql`
- `20260510143000_aisa_ai_literacy_foundations_content.sql`
- `20260511100000_learning_page_attempts.sql`
- `20260522113000_harden_rpc_grants_and_user_roles_rls.sql`
- `20260522123000_backfill_completed_v8_scores.sql`
- `20260524110000_seed_code_context_references.sql`
- `20260525120000_learning_lesson_files_bucket.sql`
- `20260527090000_grant_user_roles_select_to_authenticated.sql`
- `20260527093000_enable_dashboard_read_access.sql`
- `20260529120000_learning_pilot_hardening.sql`

Potentially already equivalent or superseded on live, based on current read-only inspection:

- `20260512100000_make_save_profile_partial.sql`
- `20260522100000_implement_v8_scoring.sql`
- `20260528143000_repair_v8_scoring_parity.sql`

These should still be validated during the clean CLI rehearsal before any live ledger repair.

## Advisor triage

Production:

- No public table with RLS disabled was found by direct SQL inspection.
- Anon-executable SECURITY DEFINER functions are the respondent token-flow RPCs:
  - `start_survey_run`
  - `complete_survey_run`
  - `save_*`
  - `set_ambassador_optin`
  - `register_tool_discovery`
- These are intentional only if token validation remains the security boundary; retain the staging smoke-test coverage before live.
- Performance advisors include unindexed foreign keys and multiple permissive policies; these are not blockers for the Learning migration, but should be tracked as follow-up hardening.

Staging:

- 21 `ref_%` tables have policies but RLS disabled. This is a staging drift/risk signal and must be resolved or explained in the clean rehearsal before live.
- Learning adds expected SECURITY DEFINER warnings for access/certification RPCs.
- `learning_content_is_valid` has mutable search path. Recommended follow-up: set an explicit `search_path` in a later hardening migration before broad rollout, or document why it is acceptable for pilot scope.

## Storage bucket and policy check

Production read-only result:

- `storage.buckets` has no `lesson-files` bucket.
- `storage.objects` has no `learning_lesson_files_%` policies.

Staging result:

- Bucket `lesson-files` exists.
- `public = true`
- `file_size_limit = 52428800`
- Policies:
  - `learning_lesson_files_select` for public reads on `bucket_id = 'lesson-files'`
  - `learning_lesson_files_insert` for authenticated content editors or super admins

Live plan implication:

- `20260525120000_learning_lesson_files_bucket.sql` is still required on live.
- After applying it in the future live window, immediately verify the bucket row and both storage policies.

## `get_user_org_id` app/DB consistency

Production read-only result:

- `profiles_total = 0`
- `profiles_without_org = 0`
- `mismatches = 0`
- `profiles_with_user_roles = 0`
- `user_roles` currently has one `dpo` row.

Interpretation:

- No live pilot profile mismatch exists because there are no live profile rows yet.
- Before live pilot users are onboarded, rerun the consistency query for actual pilot users.
- If profiles are seeded after migration, ensure `profiles.org_id` and the highest-priority `user_roles.org_id` resolve to the same org for each pilot user.

## Clean CLI rehearsal plan

The Supabase CLI is not installed in this workspace (`supabase` command not found). Before a live migration window:

1. Install or run an approved Supabase CLI version.
2. Create a fresh temporary development branch from production, or reset the existing staging branch if approved.
3. Run the exact future CLI sequence against staging only:
   - inspect remote ledger
   - repair/mark only the equivalent SAI baseline migrations on staging
   - run `supabase db push` against staging
   - verify only intended migrations are applied
4. Confirm the clean CLI result preserves or intentionally explains the `ref_%` RLS state.
5. Run SAI smoke checks and Learning content sync on staging again.
6. Only after this passes, prepare the production command list for review.

## Proposed live go/no-go gates

Go only if all are true:

- PR #3 is approved/reviewed and the owner explicitly authorizes merge.
- A clean CLI rehearsal has passed on staging.
- The final live ledger repair list is reviewed line-by-line.
- The final live migration list excludes already-equivalent SAI baselines.
- The `ref_%` RLS state is explicitly preserved or intentionally handled.
- Storage bucket migration has a post-apply verification query.
- SAI token-flow smoke checks are ready for the live validation window.
- Learning content sync is ready but remains off until migrations are confirmed.
- A rollback/stop plan exists: if any live migration fails, stop immediately and do not run content sync.

No-go if any are true:

- CLI rehearsal cannot be completed.
- Ledger repair equivalence is still name-based only.
- The planned push would replay the SAI baseline migrations on live.
- Advisor findings reveal new production-only security errors affecting Learning access.
- Storage policy creation fails on staging under CLI rehearsal.
- The owner has not explicitly approved production writes.

## Production execution outline for later approval

This is not approval to run. Future live window outline:

1. Merge PR #3 only after explicit owner approval.
2. Pull latest `main`.
3. Confirm production ref: `cfloqagsqwtrtkxdikec`.
4. Re-list live migration ledger.
5. Run approved `supabase migration repair --status applied ...` entries for equivalent SAI baselines only.
6. Run `supabase db push` and verify only missing Learning/hardening/storage migrations apply.
7. Verify:
   - `learning_%` tables exist
   - SAI tables still exist and RLS is intact
   - `lesson-files` bucket and policies exist
   - `routeai_usecase_check -> ai_literacy_foundation`
   - no Proficiency/Mastery certifications have been issued unexpectedly
8. Run Git-canonical Learning content sync once on live via the guarded admin path.
9. Re-run SAI smoke checks and Learning catalog/admin audit checks.

## Current conclusion

Production remains unchanged and is not ready for live migration yet.

The current read-only diff supports the high-level ledger equivalence hypothesis for the SAI table structure and overlapping RPCs, but it also found a meaningful staging/live security-state difference on `ref_%` RLS. Therefore the next required step is a clean CLI rehearsal on staging, not live repair.
