# Evidence Foundation

This note defines the post-PR #3 technical bridge for evidence capture. It is
intentionally small: no blockchain, knowledge graph, agents, Actor/Delegation
refactor, or AIUseCase lifecycle.

## Scope

The Evidence Foundation adds three platform capabilities:

1. Append-only platform events in `platform_event_ledger`.
2. Content/version/evidence pinning for Learning attempts and certifications.
3. Decision rationale capture for Learning review and DPO review flows.

The existing SAI `audit_events` table remains in place. The new ledger is the
cross-domain evidence plane for events that need durable reconstruction across
Learning, certification, and DPO decisions.

## Platform Event Ledger

`platform_event_ledger` stores immutable event rows with:

- `event_type`, `source_system`, actor, subject, and timestamps.
- `decision_code` and `decision_rationale` where a human or controlled rule
  changes access, certification, or review state.
- `content_version_hash` and `evidence_snapshot` for proof reconstruction.
- `previous_event_hash` and `event_hash` as a tamper-evident hash chain per
  subject.

Rows are append-only through a database trigger. Authenticated users can only
read events where they are the actor or where their org/DPO/admin role permits
it. Client roles do not receive direct insert/update/delete grants.

## Learning Pinning

`learning_page_attempts` now records:

- `content_schema_version`
- `content_version`
- `content_version_hash`
- `evidence_snapshot`
- `decision_rationale`

A database trigger pins these fields from `learning_pages` on insert/update, so
the stored evidence reflects the canonical page content at the moment of the
attempt.

`learning_certifications` now records:

- `course_version`
- `course_version_hash`
- `evidence_snapshot`
- `decision_rationale`
- `issued_by`

The certification trigger snapshots the required published pages and the latest
attempts used to support the certificate.

## Decision Rationale

Learning manual reviews persist `decision_rationale` alongside existing
`reviewer_notes`. DPO reviews gain `decision_rationale`; existing
`decision_notes` are backfilled into it when present.

Rationale is not a legal conclusion. It is the operational explanation for why a
review, access gate, or certification state changed.

## Validation Boundary

This migration may be rehearsed against local or staging databases only. It must
not be applied to production Supabase main without a separate live migration
approval and a fresh go/no-go check.
