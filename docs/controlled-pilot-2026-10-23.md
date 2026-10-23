# SAI + AI-Foto controlled pilot — 23 October 2026

Status: controlled-pilot technical chain verified in isolated staging.
Production deployment and customer invitations remain outside this approval.
The release checklist in `sai-production-release-checklist.md` records the gates.

## Current verification evidence

All results below were obtained on 23 October 2026 from the current working
code, not inferred from historical chat or July/August checks.

| Check | Observed result |
| --- | --- |
| Domain tests | 21/21 passed, including distinct-respondent/pattern suppression and unchanged V8.1 scoring cases |
| Existing mocked browser regression | 7/7 passed: regular scan, ambassador opt-in, no-tool route, resume and guards |
| Full real-staging suite | 11/11 passed at approximately 13:00 CEST: SAI plus five AI-Foto responses, card workflow, small-cell cohort, PDF, negative database/token tests |
| Final risk-dashboard/privacy changes | 2/2 targeted real-staging browser tests passed after the final reporting correction; versioned persisted scores and visible data rendered, small cohorts stayed suppressed |
| Lint / TypeScript | `pnpm --dir apps/sai lint` and `exec tsc --noEmit` passed after final code changes |
| Production build | `pnpm --dir apps/sai build` passed, including dynamic PDF route; explicit local placeholder env prevented production access |
| PDF | Three A3 landscape pages; all three rendered PNGs visually inspected; extracted text, source/version labels, absence of raw privacy sentinel and character integrity passed |
| Database boundary | Real API attempts rejected cross-org/user/anonymous access, cross-run/burned tokens, forged approval, repeated sources below threshold, draft export and duplicate insertion |

The full card workflow first passed with actual edits/review/approval at 12:32
CEST. Subsequent reruns preserve those immutable approved artifacts and verify
idempotency; they do not pretend to re-edit approved cards. The current suite
contains 12 tests (the additional SAI dashboard case was validated separately).
Test files: `apps/sai/tests/pilot/controlled-pilot.spec.ts` and `integrity.spec.ts`.

Final sample: `output/pdf/ai-foto-pilot.pdf`, 6,228 bytes, export record
`9662fa9c-bea1-4627-a9d6-c1915964d510`, generated at
`2026-10-23 11:00:09.920342+00`. SHA-256:
`0865257a6e00431d077577180f72d6f46f5ba0c70764f7fb81e84807c09e8342`.
The file hash/size match `report_exports`; its `ai_foto.pdf_generated` event was
verified. Later reproductions legitimately create a different timestamp/hash.
Poppler reported missing optional Symbol/ArialUnicode display fonts; all three
rendered pages were readable and text extraction contained no replacement glyphs.

## Scope and environment

- Repository: `Sugijomon/digidactics-ai-platform`.
- Branch: `codex/sai-production-readiness`; draft PR #5. No main merge.
- Existing work preserved and pushed in `718a62e` before repairs.
- Verified Supabase non-default branch: `learning-system-staging-rehearsal`,
  ref `gpptjkwxqxxdsjgwzhzl`, parent production `cfloqagsqwtrtkxdikec`.
  Only the staging branch was changed. The app runs on `127.0.0.1:3105`.
- Docker Desktop's engine failed during inference-manager initialization;
  hosted isolated staging was used. No Docker reset or production fallback.
- Existing `.env.local` was preserved. Ignored `.env.pilot.local` holds the
  staging public key and random fixture password. No service-role key is used.
- Explicit TEST organizations A/B and five reserved `.invalid` accounts live
  in `supabase/seed/20261023_controlled_pilot_fixture.sql`. No email was sent.
  The fixture requires transaction-local environment/password opt-in.
- Staging lacked the full department reference catalog: applied the existing
  `supabase/seed/20260505_v8_1_reference_seed.sql` to staging. This is reference
  data, not customer/demo answers. Failed attempts remain identified TEST runs.
- The three August AI-Foto migrations already existed in staging under its
  migration ledger. No bulk `db push`, reset or duplicate replay was used.
  New staging migrations: `20261023100645_harden_ai_foto_pilot_integrity.sql`
  and `20261023101819_add_ai_foto_pdf_export_registration.sql`.

## Verified behavior and repairs

- Real SAI and five AI-Foto browser responses completed, resumed from the
  start page, persisted scoring, and burned the submission token at completion.
- The AI-Foto wizard could submit while changing its final navigation button
  from `button` to `submit`. Separate React keys now prevent skipping the last
  section. The real browser path selects a final-section answer before saving.
- Dashboard patterns use completed primary applications, no task free text,
  and a minimum of five identical patterns. Individual signal counts are
  also suppressed below the configured minimum (floor five).
- Card generation counts distinct run IDs; multiple applications/references
  from one respondent cannot satisfy the privacy threshold.
- Generation preserves reviewed/approved items. A unique index and conflict
  handling prevent duplicate cluster cards under concurrent generation.
- Edits invalidate review. Approval requires a previously saved reviewed
  version, completed same-org/same-wave sources, distinct respondent count,
  interpretation and neutral language. Approved items are immutable.
- Survey self-report supports at most `aannemelijk`; independent proof is not
  implemented. No SAI V8.1 score formulas were changed.
- Database triggers record card audit events atomically with the change.
- SAI risk drilldowns now suppress exact structured patterns on the server and
  count distinct respondents. The top-cluster table shows actual max exposure
  instead of a mislabeled arithmetic mix; synthetic trends now say `Niet gemeten`.

## PDF contract

The download selects approved items from one AI-Foto wave, all three card
types, analysis `ai-foto-analysis-v1`, and the current privacy threshold. The
server reads authoritative metadata through the authenticated client's RLS.
The template `ai-foto-a3-v1` produces A3 landscape sheets, one item per sheet,
with continuation pages for long content. It includes observation,
interpretation, evidence level/count, open questions, precaution, follow-up,
owner/review date, item/wave IDs, approval/export timestamps, versions, source
limits and the fixed disclaimer. No respondent identifiers or raw task text
are included.

The file is generated in memory and delivered directly, never placed in a
public bucket. SHA-256, size, selected IDs, actor, versions and limitations are
recorded in `report_exports`; `ai_foto.pdf_generated` is inserted in the same
transaction. Registration failure prevents file delivery. `generated` means
generated/registered, not proof the recipient saved or read it. Download uses
same-origin POST, authenticated DPO/org-admin/super-admin access, and no-store.

## Reproduce and demonstrate

1. Inspect the staging branch identity and migration ledger first. Never point
   these fixtures/tests at production. Set up `.env.pilot.local` locally with
   `SAI_PILOT_TARGET=staging`, the staging URL/public key, and the fixture
   password; use no service-role key. The test config pins the verified ref.
2. Run `corepack pnpm install --frozen-lockfile`, then
   `corepack pnpm --dir packages/domain build`.
3. Run `corepack pnpm --dir apps/sai test:pilot`. It owns its temporary server
   on port 3105; do not run another app instance on that port during tests.
4. For a guided demo run `corepack pnpm --dir apps/sai dev:pilot`. Open
   `/survey`; TEST codes are `sai-pilot-20261023` and
   `ai-foto-pilot-20261023`. They expire after 30 days from fixture creation.
5. Complete the scan or return to `/survey` to resume the active browser
   session. Show the AI-Foto final section before explicitly finishing it.
6. Log in as `dpo@sai-pilot.staging.invalid` using the local fixture password.
   Show `/dashboard/risicoprofiel` and `/dashboard/ai-foto`.
7. Generate cards. For an unapproved card: edit interpretation, save, mark
   review ready, approve. Existing approved test cards stay immutable.
8. Download A3/PDF. Show all three sheets and correlate SHA-256/file size with
   the latest `report_exports` row and its audit event.

Generated local evidence lives under ignored `output/pilot/` and `output/pdf/`.
Code/tests and this evidence record belong in GitHub; credentials, browser
traces containing tokens, and generated local utilities do not.

## Boundaries and production go/no-go

Before any production pilot, an accountable owner must explicitly approve:

- [ ] Review/approve the draft PR, release commit and exact migration plan;
  reconcile the production migration ledger instead of bulk pushing.
- [ ] Production backup/restore and rollback plan; confirm reference catalogs,
  schema, grants, RLS, auth URLs and runtime environment for the chosen release.
- [ ] Provision real organization membership and DPO/admin roles; verify them
  using a controlled production acceptance procedure before invitations.
- [ ] Agree purpose, privacy notice, retention/deletion, access, support owner,
  participant scope and the minimum reporting population with the customer.
- [ ] Decide authentication method. Password login is tested here; actual
  magic-link delivery/callback against the future production host is not.
- [ ] Test the intended deployed HTTPS host and export origin/cache behavior.
  Current proof is a local app connected to hosted staging, not a deployment.
- [ ] Review the final three cards with a human; self-report is not independent
  evidence, legal classification, compliance certification or employee ranking.
- [ ] Secure downloaded reports and apply the agreed retention policy. The
  pilot does not provide a persistent PDF archive or signed certificate.
- [ ] Remove/expire staging fixtures and credentials after the rehearsal.

Known limits: resume uses the same browser's session storage; incomplete
within-step input is not a cross-device draft. Export supports up to 60 approved
items; it is a three-card set, not necessarily exactly three pages for multiple
items. The built-in PDF font supports Dutch/Western European text; unsupported
glyphs cause a visible export error rather than silent character loss. An
approved item must be superseded through a future version workflow if correction
is needed; this pilot does not mutate approved evidence. No RAI modules added.

Production remains NO-GO until the explicit checks above are performed.

There are no outstanding blockers to the verified local-app/staging rehearsal.
This does not certify a deployed production environment or email delivery.
