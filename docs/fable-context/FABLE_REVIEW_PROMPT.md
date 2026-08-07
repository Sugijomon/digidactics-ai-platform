# Fable Full-System Review Prompt

Give Fable the public repository URL, branch
`codex/evidence-foundation`, and this prompt. Fable should first read
`docs/fable-context/FABLE_CONTEXT_BRIEF.md` and
`docs/fable-context/FABLE_DOC_INDEX.md`.

---

You are acting as a senior product architect, accessibility-minded learning
experience reviewer, security-conscious Supabase reviewer, and pragmatic CTO.

Review the complete RAI Learning System in the public GitHub repository
`Sugijomon/digidactics-ai-platform` at branch
`codex/evidence-foundation`.

Important branch topology:

- PR #3 is `codex/integrate-rai-learning-with-sai-main` -> `main` and contains
  most of the Learning System implementation.
- Draft PR #4 is `codex/evidence-foundation` ->
  `codex/integrate-rai-learning-with-sai-main` and contains the later evidence,
  organization-context, staging, content, and route work.

Do not review only the PR #4 diff: inspect the full tree of
`codex/evidence-foundation`. Use the PR #4 diff to assess its incremental layer
and PR #3 to understand the integration against `main`.

Do not merge or approve either PR, deploy code, change GitHub state, run
migrations, access production credentials, or mutate Supabase. This is a
read-only review.

## Review goals

Assess:

1. correctness of learner, organization-context, attempt, review, progress,
   competency, and certificate flows;
2. completeness, answer logic, consistency, accessibility, and committed-asset
   reproducibility of AI Literacy Foundation, AI Proficiency, and AI Mastery;
3. Supabase migration ordering/dependencies, schema integrity, RLS/grants,
   authorization boundaries, pilot seed, smoke tests, and staging-to-Git
   reproducibility;
4. append-only ledger semantics, content/context/evidence pinning, decision
   rationale, and reconstructability of certifications;
5. route/auth behavior, operational documentation, branch integration risk,
   and production-readiness gaps.

Be strict about both security and scope. Flag irreversible evidence loss and
authorization weaknesses. Do not propose speculative platform redesigns as
current blockers. Blockchain, knowledge graph, agents, full Actor/Delegation,
AIUseCase lifecycle, and PolicyVersion/rules-as-data are intentionally outside
this implementation.

## Required output

Start with a short executive summary. Then provide findings classified as:

- **Blocker** — must be resolved before the relevant go/no-go;
- **Important non-blocker** — significant but can be explicitly deferred;
- **Improvement** — valuable follow-up.

For every finding include:

- affected flow or requirement;
- repository evidence with file and line where possible;
- concrete impact or failure scenario;
- the smallest safe remedy;
- which decision it affects.

Give explicit, separate go/no-go recommendations for:

1. completing the current staging rehearsal and manual acceptance test;
2. merging draft PR #4 into `codex/integrate-rai-learning-with-sai-main`;
3. subsequently merging PR #3 into `main`;
4. eventual production migration and rollout.

Finish with:

- an ordered manual acceptance checklist for the reviewer flow and certificate
  issuance;
- documentation contradictions or missing operator guidance;
- risks that belong after the pilot and do not block the present scope;
- questions that truly require founder/product judgment.

Do not infer that earlier passing tests prove the remaining manual review and
certificate flow. Tie conclusions to the current branch state.
