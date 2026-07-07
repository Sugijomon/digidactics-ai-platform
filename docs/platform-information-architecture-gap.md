# Platform information architecture gap

Status: architecture gap note, not a PR #3 implementation requirement.

Date: 2026-07-07

Source review: `INFORMATION_ARCHITECTURE_REVIEW.md` by Fable.

## Purpose

PR #3 integrates the RouteAI Learning System with the current SAI foundation.
The staging rehearsal proved that the integration can be prepared safely, but
Fable's five-year information architecture review identifies a broader platform
gap: the current pilot schema captures current state well enough, but it does
not yet capture all evidence, versions, decisions, and rationales needed for
future auditability, organizational intelligence, and agent governance.

This note records the gap so it can guide the next phase without expanding the
scope of PR #3 or the current live migration preparation.

## What the current architecture already does well

- SAI and RAI share one Supabase foundation instead of becoming throwaway
  products.
- SAI respondent writes go through token-validated RPCs instead of direct table
  writes.
- SAI persists scoring output in `risk_result`, `risk_result_tool`,
  `dpo_review_items`, and `audit_events`.
- Learning uses the same `organizations`, `profiles`, `user_roles`, and
  org-scoped RLS foundation.
- Learning content has a flexible delivery model:
  `learning_courses -> learning_topics -> learning_pages -> content.blocks[]`.
- AI Literacy already acts as a RouteAI access gate through
  `learning_access_requirements` and
  `learning_check_capability_access('routeai_usecase_check')`.

These choices remain valid for the pilot and for PR #3.

## Key gap

The current architecture is module-oriented:

```txt
SAI -> Learning -> Governance -> Knowledge -> Agents
```

Fable's review argues that the long-term platform needs an information model
oriented around shared records and append-only evidence:

```txt
Record plane      -> current mutable state
Evidence plane    -> immutable domain events and decisions
Intelligence plane -> derived graph, recommendations, benchmarks, agents
```

The important gap is not that the current pilot schema is unusable. The gap is
that some evidence is not yet captured in a durable, version-pinned form.
History that is never captured cannot be reconstructed later.

## Highest-value additions

### 1. Platform event ledger

Current state:

- `audit_events` exists in SAI and is append-only, but it is not yet a
  platform-wide domain event ledger.
- Learning does not yet emit durable events for content sync, page completion,
  attempt grading, manual review, or certification issuance.

Needed direction:

- Add a platform-level `domain_events` or `platform_events` table.
- Store who did what, to which subject, when, under which version/policy, with
  which rationale and correlation id.
- Treat dashboards, passports, knowledge graphs, and organizational
  intelligence as projections over the event stream.

### 2. Content and certification version pinning

Current state:

- `learning_pages` has `version` and `content_schema_version`.
- `learning_page_attempts` stores answers, score, percentage, pass state, and
  reviewer notes.
- `learning_certifications` links to `course_id` and `enrollment_id`.

Gap:

- Attempts do not explicitly pin the exact page content version/hash used when
  the learner answered.
- Certifications do not pin the exact content version, assessment version, or
  evidence snapshot that justified issuance.

Needed direction:

- Add page/content version metadata to attempts.
- Add content/evidence snapshot metadata to certifications.
- Ensure future auditors can answer: what did this learner see, answer, and
  satisfy when the credential was issued?

### 3. Assessment as a domain object

Current state:

- Assessment and quiz definitions live inside `learning_pages.content` JSONB.
- Grading logic inspects page blocks and answer keys.

Gap:

- This is acceptable for pilot delivery, but it is not a strong long-term
  model for reusable item banks, assessment versioning, psychometrics,
  competency mapping, or standalone AI Skills Assessments.

Needed direction:

- Keep JSONB blocks for rendering.
- Move authoritative assessment definitions and answer keys into a Capability
  or Assessment context.
- Let learning pages reference assessment definitions by stable id/version.

### 4. AI use case lifecycle

Current state:

- SAI captures use cases as survey response rows.
- RouteAI currently has a capability gate for `routeai_usecase_check`, but no
  first-class AI use case lifecycle aggregate.

Gap:

- "SAI feeds RouteAI" is a product claim, not yet a durable database lifecycle.

Needed direction:

- Introduce an `AIUseCase` aggregate after the pilot.
- Treat SAI as a disclosure/intake channel that can promote survey responses
  into AI use cases.
- Model lifecycle states such as disclosed, triaged, assessed, conditionally
  approved, active, reassessed, and retired.

### 5. Decision with rationale

Current state:

- `dpo_review_items` has decision-like fields and `decision_notes`.
- `learning_page_attempts` has `reviewer_notes`.

Gap:

- Decisions are not yet generalized across SAI, Learning, Governance, Policy,
  Knowledge Capture, and future Agents.

Needed direction:

- Treat decisions as durable platform evidence.
- Require rationale where human judgment changes access, certification,
  approval, restriction, override, or escalation.
- Emit corresponding domain events.

### 6. Actor and delegation

Current state:

- The platform primarily assumes human users via Supabase Auth and
  `profiles`/`user_roles`.
- System actions are often represented by null actor or service-side context.

Gap:

- Future agents and service principals need accountable identity and delegation.

Needed direction:

- Later introduce an Actor abstraction:
  `human`, `service`, `agent`.
- Record both acting actor and accountable human/org when an agent acts under
  delegation.
- Do not add this to PR #3; it is a later invasive refactor.

## Proposed bridge from PR #3 to the long-term architecture

This should be a separate post-PR #3 evidence-foundation phase.

### Phase A - Evidence hardening

Small additive migration and app changes:

- Add `domain_events` or `platform_events`.
- Emit events for:
  - learning content sync executed
  - learning page completed
  - learning page attempt submitted/graded
  - learning certification issued/revoked/superseded
  - SAI survey completed/scored
  - DPO review item decided
- Add content version/hash fields to `learning_page_attempts`.
- Add evidence snapshot/version fields to `learning_certifications`.

### Phase B - Assessment extraction

Post-pilot refactor:

- Add assessment definitions and items.
- Move answer keys out of page rendering JSONB.
- Keep page blocks as delivery references to assessment definitions.

### Phase C - RouteAI governance foundation

Later platform work:

- Add `AIUseCase` lifecycle aggregate.
- Generalize access gates beyond `learning_access_requirements`.
- Add PolicyVersion/rules-as-data.
- Add Decision records with rationale.

### Phase D - Intelligence plane

Only after evidence exists:

- Project events into knowledge assets, graph nodes/edges, recommendations,
  benchmarks, and future agent workflows.
- Keep this derived and rebuildable.

## Explicit non-goals for PR #3

Do not add these to the current PR:

- A knowledge graph.
- Agent memory.
- Full Actor/Delegation identity refactor.
- Assessment item bank.
- AIUseCase lifecycle schema.
- PolicyVersion/rules-as-data.
- Benchmark/cohort architecture.

Those are valid future directions, but adding them now would invalidate the
controlled staging rehearsal and expand the live migration risk.

## Recommendation

Keep PR #3 focused on the rehearsed Learning + SAI integration and live
migration preparation.

After PR #3 is reviewed and before broader rollout, open a separate
Evidence Foundation task/PR that stops the irreversible information loss first:

1. platform event ledger,
2. content/credential version pinning,
3. decision rationale capture.

Everything else in Fable's review becomes easier and less risky once those
three are in place.
