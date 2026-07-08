# AI-rijbewijs voor Agents — Product Architecture Note

> Status: roadmap-reference (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

**Status:** roadmap / vision note. Not implementation scope for any current PR.
**Depends on:** Evidence Foundation (platform event ledger, version pinning, decision rationale), ADR-EF-2 (agent-ready event envelope).
**Audience:** product, architecture, and future implementation planning.

---

## The idea in one sentence

The same machinery Digidactics uses to certify *employees* for responsible AI use — assessments, evidence-pinned credentials, expiry, access gates, human oversight — is applied, unchanged in principle, to *AI agents* operating inside an organization.

## Why this is a natural extension, not a new product

The EU AI Act makes organizations accountable as deployers of AI systems. Today that means governing tools and the humans who use them. As autonomous agents become normal members of the workforce, the deployer question does not change — *"can this actor be trusted with this task, and can we prove it?"* — only the actor does. An organization that already answers that question for employees through RouteAI should be able to answer it for agents through the same system, with the same auditability. No competitor certifies humans and machines on one evidence spine; this is the platform's long-term differentiator.

## The seven concepts

**Actor.** Identity becomes polymorphic: `human | agent | service`. An agent is a first-class principal with its own identity record, its own credential wallet, and its own event history — never an anonymous "system" write. The Evidence Foundation envelope already anticipates this: `actor_kind` includes `'agent'`, `actor_id` is nullable pending an Actor table, and subjects are unconstrained references (ADR-EF-2). No ledger rework will be needed when agents arrive.

**Delegation.** An agent never acts on its own authority. Every agent operates under a `Delegation`: an explicit, scoped, expiring grant from an accountable human or organizational role ("agent X may perform verb set Y on data classes Z, until date D, on behalf of role R"). Every agent event records both the acting agent and the accountable principal. Delegation is what keeps the human-in-the-loop doctrine true when the loop contains software.

**Credential.** The agent's rijbewijs. Structurally identical to the employee credential: it attests that the actor passed defined assessments, it pins the exact assessment and content versions used, it carries evidence references into the ledger, and it expires. Agent-specific dimensions are pinned too: model identity and version, system-prompt version, and configuration hash — because an "agent" that silently changes models is a different actor, and its credential must say so. Re-certification triggers mirror the employee flow: policy version changes, incident patterns, or expiry.

**Capability.** What a credential unlocks. The existing gate pattern (`requirements → capability`) generalizes: capabilities like *handle class-2 personal data*, *draft external communications*, or *execute purchases under €X* are granted only to actors holding the required, unexpired credentials under a valid delegation. Humans and agents pass through the same gates; the gate does not care what kind of actor is asking — only whether the evidence holds.

**Policy Decision Point (PDP).** Humans read policy; agents must *query* it. Before any consequential action, an agent asks: `evaluate(actor, verb, subject, data_class) → permit | deny | require_human(reason, policy_version)`. This requires governance rules to exist as versioned data with effective dates rather than prose or code — the planned PolicyVersion work. Every PDP answer is itself evidence: the ledger records which rule version permitted or blocked which action, making "the agent was authorized under the policy in force at that moment" a provable statement rather than a claim.

**Proposal-only writes.** Agents never mutate the system of record directly. Agent output lands as *proposals* — decision drafts, knowledge-asset drafts, recommendation drafts — that a human approves, amends, or rejects. Human oversight thereby stops being a training-slide instruction and becomes a structural property of the write path. The pattern already exists in miniature: the learning manual-review queue is exactly this shape, and generalizes.

**Audit trail.** Nothing new to build — this is why Evidence Foundation comes first. Agent actions, PDP decisions, delegations, credential issuance and expiry, proposals and their human verdicts all flow into the same append-only, hash-chained `platform_event_ledger` as employee evidence, with the same tamper-evidence, the same rationale requirements on judgment events, and the same projections (an agent's Accountability Passport is the same query as an employee's, filtered on a different actor).

## How the Evidence Foundation enables this later

The foundation was deliberately designed so that agent governance is *additive*: the envelope is actor-polymorphic (ADR-EF-2); credentials are already evidence-pinned and expiring; gates already exist as data; rationale capture already distinguishes machine and human judgment (`decision_code`); and correlation/causation IDs already support tracing multi-step agent workflows. What remains for the future phases — and is explicitly **not** current scope — is the Actor/Delegation identity model, agent-specific assessment content, PolicyVersion-as-data with the PDP interface, and the generalized proposal workflow.

## Sequencing (indicative, post-pilot)

1. Actor & Delegation model (the one invasive refactor — do it before any agent work).
2. PolicyVersion-as-data → PDP interface.
3. Agent assessment content + credential issuance for a first internal agent (the platform's own knowledge-distillation agent is the natural pilot subject).
4. Proposal workflow generalization; agent Passport projection.

## Explicit non-goals now

No agent tables, no delegation schema, no PDP, no agent credentials in any current PR. This note exists so that near-term decisions (event envelope shape, credential pinning, gate design) keep this door open — which, as of the Evidence Foundation, they do.

Fase-5-herbeoordeling start bij de eerste concrete klantvraag om een agent te governen, of bij de bouw van de eigen distillatie-agent - welke het eerst komt.

---

*Related: ADR-EF-2 (agent-ready envelope) · docs/architecture/evidence-foundation-principles.md · docs/adr/architecture-decision-register.md · docs/reference/architecture-review-2026-07.md*
