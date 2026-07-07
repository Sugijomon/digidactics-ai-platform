# ADR-EF-2: Agent-Ready Evidence Envelope

Status: accepted

Date: 2026-07-07

## Decision

The platform event envelope is designed to describe non-human actors without
implementing the Actor/Delegation model yet.

- `actor_kind` includes `agent`.
- `actor_id` remains nullable and continues to reference `profiles` until a
  first-class Actor table exists.
- `subject_table` and `subject_id` remain unconstrained text so future
  aggregates, including agents and AI use cases, can become event subjects
  without reshaping the ledger.

## Explicit Non-Decisions

This ADR does not add:

- Actor or Delegation schema.
- Agent credentials.
- Agent permissions.
- Policy Decision Point APIs.
- Agent write access to record-plane tables.

## Rationale

The product roadmap includes certifying AI agents with the same
Capability/Credential machinery used for employees: an "AI-rijbewijs voor
agents". The future model should support scoped, expiring, evidence-pinned
credentials for agent actors operating under human or organizational
delegation.

Recording this now makes the Evidence Foundation credible for future agentic
governance while keeping the current PR limited to evidence capture.
