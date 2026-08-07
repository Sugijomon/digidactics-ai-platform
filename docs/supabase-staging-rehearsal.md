# Supabase Staging Rehearsal Plan

Status: AI Literacy Context Pack rehearsal passed on staging on 2026-08-05;
this is still not a live deployment script.

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
- Active rehearsal branch: `learning-system-staging-rehearsal`
- Rehearsal project ref: `gpptjkwxqxxdsjgwzhzl`

The local RAI development environment may point to a separate Supabase project,
but a project URL alone is not authorization to apply schema changes. Confirm
the project name and branch in the Supabase dashboard before treating it as
staging.

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
20260707190000_evidence_foundation.sql
20260805092242_align_ai_literacy_core_content.sql
20260805092255_add_learning_context_pack_releases.sql
20260805110413_grant_learning_context_policy_helpers.sql
20260805110534_grant_learning_certification_issue_to_authenticated.sql
20260805110717_fix_learning_certification_issue_ambiguity.sql
20260805111011_optimize_learning_context_pack_rls_and_indexes.sql
20260805114500_secure_context_hash_triggers.sql
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

## AI Literacy Context Pack Rehearsal

After the full migration chain and Git-canonical AI Literacy pages are present:

1. Load `supabase/seed/20260805094000_learning_context_pack_pilot.sql` only in
   local/staging.
2. Run
   `supabase/smoke-tests/20260805093000_learning_context_packs_smoke.sql` as the
   database owner with `ON_ERROR_STOP=1`.
3. Confirm the transaction ends with `ROLLBACK` and leaves no smoke-test rows.
4. Sign in as a learner linked to the fictitious pilot organization and inspect
   pages 3, 6, 8, 12, 14 and 15.
5. Confirm page 15 stores one acknowledgement for the enrollment-pinned release.
6. Publish a second fictitious release, switch the catalog, and verify that an
   old enrollment remains on v1 while a new enrollment receives v2.

Do not run this rehearsal against project `cfloqagsqwtrtkxdikec`; repository
records identify that project as `main / production` and its migration ledger
does not match the local filenames.

### Context Pack Rehearsal Result - 2026-08-05

The existing isolated preview branch `learning-system-staging-rehearsal` was
active and healthy. Its earlier migration ledger contained semantic equivalents
of the baseline SAI and Learning migrations under staging-specific timestamps.
The following missing current migrations were applied through the Supabase
migration API:

- `evidence_foundation`
- `align_ai_literacy_core_content`
- `add_learning_context_pack_releases`
- `grant_learning_context_policy_helpers`
- `grant_learning_certification_issue_to_authenticated`
- `fix_learning_certification_issue_ambiguity`
- `optimize_learning_context_pack_rls_and_indexes`
- `secure_context_hash_triggers`

The fictitious pilot seed was loaded successfully. Final persistent staging
state:

- AI Literacy course version: `2`
- active topics: `6`
- published pages: `15`
- pilot organizations: `1`
- published pilot Context Pack releases: `1`
- active pilot catalog mappings: `1`

The transaction-based Context Pack smoke test passed after validating:

- full JSON shape and rejection of unknown/free-form fields;
- immutable published releases;
- active release pinning for new enrollments;
- null pins remaining null for legacy enrollments;
- rejection of learner-selected non-active releases;
- organization A/B admin and learner RLS isolation;
- hidden draft releases and readable archived pinned releases;
- acknowledgement snapshots;
- core/context hashes on attempts and certifications;
- certification eligibility against the pinned release.

The smoke transaction left zero smoke organizations, profiles and
acknowledgements behind. Only the explicitly marked fictitious pilot seed
remains.

The rehearsal exposed and repaired three pre-existing staging-chain gaps:

1. missing `authenticated` EXECUTE on `is_learning_admin_for(uuid)`;
2. missing intended caller grants on the guarded certification RPC;
3. ambiguous unqualified columns in
   `learning_issue_certification_for_enrollment(uuid)`.

Post-migration advisors report one intentional relevant security warning: the
certification RPC is callable by `authenticated` as `SECURITY DEFINER`. This is
required for its controlled write path; `anon` has no EXECUTE permission and
the function verifies identity, enrollment, page completion and evidence before
issuing. Relevant performance findings are limited to unused-index information,
which is expected on an otherwise empty preview database.

A read-only isolation check confirmed that production project
`cfloqagsqwtrtkxdikec` still has no Context Pack tables or evidence ledger.

### Authenticated learner rehearsal - 2026-08-05

A real Supabase Auth staging identity was created for the fictitious pilot:

- user: `rai-staging-pilot@digidactics.invalid`
- user id: `8ef57edd-9460-429c-90dc-4920ca2316cd`
- organization: `00000000-0000-0000-0000-000000000701`
- role: `user`

The RAI app was started locally against the staging branch. The authenticated
learner completed all 15 visible AI Literacy pages through the browser,
including scenarios, reflections, checklists, the slide deck, the final
assessment and the Context Pack v1 policy acknowledgement.

This browser run exposed and repaired three issues that the SQL-only smoke test
could not detect:

1. evidence-hash trigger functions ran with learner privileges and could not
   execute the deliberately private `digest` wrapper;
2. certification progress included archived required pages, producing 70%
   enrollment progress after all 15 visible pages were complete;
3. a direct start from the Learning overview could write the first page attempt
   before an enrollment existed and therefore before a Context Pack was pinned.

The trigger functions now use tightly scoped `SECURITY DEFINER` execution with
a fixed search path while `digest` remains unavailable to client roles. Course
eligibility now counts only published required pages, and page completion first
ensures an enrollment exists. The learner landing page also distinguishes
`Training afgerond - review nodig` from a genuinely issued certificate.

Final audit state:

- 15/15 page progress rows completed;
- enrollment at 100%, still `in_progress` while manual review is pending;
- Context Pack release `00000000-0000-0000-0000-000000000711` pinned;
- 13 latest evidence-bearing page attempts, all Context Pack-pinned and hashed;
- 1 Context Pack acknowledgement, pinned and hashed;
- 14 ledger events, all hashed;
- 7 evidence-bearing pages waiting for manual review;
- 0 certifications, as expected until that review is completed.

The synthetic staging identity is intentionally retained for the review and
certificate phase. No reusable password was stored in the repository or local
environment files.

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
