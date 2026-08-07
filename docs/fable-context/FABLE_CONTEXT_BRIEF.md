# Fable Full-System Context Brief

Purpose: give Fable enough current product, implementation, database, and
release context to perform a pre-merge review of the complete RAI Learning
System without drifting into a broad platform redesign.

## Repository and branch topology

- Public repository: `Sugijomon/digidactics-ai-platform`
- Review branch: `codex/evidence-foundation`
- Implementation baseline before this review brief:
  `7952b4c28242ba9a770e189d6a66242940ac597e`
- Draft PR #4: `codex/evidence-foundation` ->
  `codex/integrate-rai-learning-with-sai-main`
- Open PR #3: `codex/integrate-rai-learning-with-sai-main` -> `main`
- PR #3 contains most of the Learning System. PR #4 adds the evidence layer,
  organization context, staging hardening, content additions, and route docs.

Fable must inspect the **complete tree of `codex/evidence-foundation`**. A
review of the PR #4 diff alone is insufficient because its base branch already
contains most learner, editor, certification, and Supabase integration work.
Use the PR #4 diff separately to assess the newer evidence/audit and context
changes. PR #3 provides the integration history against `main`.

Do not merge either PR, deploy, or run production migrations as part of this
review.

## Review objective

Provide a practical pre-merge go/no-go assessment across:

1. product behavior and learner/reviewer flow correctness;
2. content quality, accessibility, and internal consistency of all courses;
3. Supabase schema, migration order, RLS/grants, and staging safety;
4. evidence, manual-review, decision, and certification auditability;
5. branch-integration and production-rollout risks.

Give separate recommendations for:

- finishing the staging rehearsal;
- merging PR #4 into its integration base;
- merging PR #3 into `main` later;
- an eventual production rollout.

## Product and implementation scope

RouteAI is a SaaS platform for AI governance, compliance, and learning for
Dutch and European SMEs. The relevant surfaces are:

- SAI / Shadow AI Scan for visibility into actual AI use;
- RAI / RouteAI governance infrastructure;
- the Learning System with AI Literacy Foundation, AI Proficiency, and AI
  Mastery;
- learner enrollment, page attempts, progress, review, competency evidence,
  and certificate issuance;
- organization-specific context packs and immutable releases that influence
  the learner experience and evidence record.

The intended evidence sequence is:

1. A learner receives the applicable organization and content context.
2. Attempts pin content/context versions and retain reconstructable evidence.
3. Required work is reviewed by an authorized human reviewer.
4. Review decisions retain rationale and emit ledger events.
5. A certificate is issued only when the course rules are satisfied and pins
   the relevant evidence/version state.

## Evidence Foundation boundary

The current evidence bridge intentionally includes:

- append-only `platform_event_ledger` events and tamper-evident fields;
- content/version/evidence pinning for Learning attempts and certificates;
- durable decision rationale for Learning and DPO reviews;
- an agent-ready event envelope without implementing agents.

It intentionally does not implement blockchain, a knowledge graph, agent
memory, a full Actor/Delegation refactor, an AIUseCase lifecycle,
PolicyVersion/rules-as-data, or a broad platform redesign.

The long-term framing is three planes:

- record plane: mutable operational state;
- evidence plane: append-only events, decisions, versions, and rationale;
- intelligence plane: future derived graph, recommendations, benchmarks, and
  agents.

Fable should flag irreversible evidence loss, but keep future architecture out
of the present migration unless it is a genuine blocker.

## Supabase safety context

Production Supabase:

- project ref: `cfloqagsqwtrtkxdikec`;
- read-only inspection only;
- no production migrations, content sync, or `supabase db push`;
- its migration ledger is known to differ from the repository ledger, so a
  later production plan requires explicit reconciliation and approval.

Staging rehearsal:

- project ref: `gpptjkwxqxxdsjgwzhzl`;
- branch/project name: `learning-system-staging-rehearsal`;
- some new migrations and pilot data have already been applied and checked;
- migrations must not be replayed merely for this review.

The committed migration chain is intended to reproduce the applied staging
state. Review timestamps, dependencies, RLS, grants, seed targets, smoke-test
targets, and idempotency/rollback assumptions statically. Do not access or
modify production.

## Current verification state

The implementation branch passed locally before this brief was added:

- `git diff --check`;
- TypeScript typecheck;
- Learning governance checks for 3 courses and 237 blocks;
- relevant domain/context tests (12/12);
- RAI production build with key learner and admin routes.

A staging learner walkthrough recorded 15/15 pages complete, 13
evidence-bearing latest attempts, one context acknowledgement, and 14 ledger
events. Seven pages still require human review; no certificate has been issued.
Manual reviewer approval/rejection and final certificate issuance therefore
remain the principal hands-on acceptance tests.

## Review constraints

- Treat the current review branch as implementation truth and documents as
  product intent; report mismatches explicitly.
- Do not assume untracked local audio, slide uploads, backups, schema exports,
  visual checks, or generated PDF output are available in GitHub.
- Course content does not currently reference the excluded local audio/slide
  uploads; assess reproducibility from the committed tree.
- Do not expose secrets, request production credentials, or instruct anyone to
  weaken RLS/authentication to make a test pass.
- Classify findings as blocker, important non-blocker, or improvement.

## Desired output

Produce:

- executive summary and explicit go/no-go decisions;
- findings with severity, evidence (file/line where possible), impact, and a
  concrete remedy;
- learner/content/accessibility observations for all three courses;
- database and auditability assessment;
- missing or contradictory documentation;
- a short, ordered manual acceptance checklist;
- risks deferred to post-pilot, clearly separated from current blockers.
