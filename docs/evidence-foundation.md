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

SAI `audit_events` remains authoritative for current survey/scoring telemetry.
The platform ledger captures the first cross-domain evidence events. The two
logs should be formally reconciled in the future AI use case lifecycle phase.

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

The ledger is tamper-evident, not tamper-proof. Roles with definer-level
database access can disable triggers or rewrite rows; the per-subject hash chain
exists so manipulation is detectable, not impossible. Chain verification should
be part of periodic compliance checks.

Event types follow `domain.subject.verb_in_past_tense`, for example
`learning.certification.issued` and `dpo.review.decision_recorded`. Payload
shape changes must bump `event_schema_version`; do not mutate the meaning of an
existing event type.

Initial event registry:

- `learning.content.synced`
- `learning.page_attempt.submitted`
- `learning.page_attempt.reviewed`
- `learning.lesson_attempt.submitted`
- `learning.lesson_attempt.reviewed`
- `learning.certification.issued`
- `learning.certification.updated`
- `dpo.review.decision_recorded`

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

### Organization Context Pinning

AI Literacy attempts additionally pin:

- `context_pack_release_id`
- Context Pack version and content hash
- the `organization_context` slots present on the page
- a deterministic `composition_manifest_hash`

The manifest hash covers the core page/course hash, Context Pack release/hash,
and used slots. It does not cover rendered HTML or styling. The immutable
Context Pack release remains stored so the hash is reproducible rather than
being the only surviving evidence.

The Context Pack is pinned on `learning_course_enrollments`. Activating a newer
release in the organization catalog therefore affects only new enrollments.
Certification rejects required evidence when the latest attempt hash differs
from the current core page or when the attempt used a different Context Pack
than the enrollment.

`learning_context_acknowledgements` is append-only learner evidence that the
local organization policy was read. It is kept separate from the platform core
assessment and is included in the certification evidence snapshot when present.

## Decision Rationale

Learning manual reviews persist `decision_rationale` alongside existing
`reviewer_notes`. DPO reviews gain `decision_rationale`; existing
`decision_notes` are backfilled into it when present.

Rationale is not a legal conclusion. It is the operational explanation for why a
review, access gate, or certification state changed.

`decision_rationale` is operational evidence, not a narrative field. It must
describe the decision basis and must not contain special-category personal data
or personal data of third parties. Rationale about the subject of the decision
is expected and appropriate. This convention matters because ledger rows are
immutable.

The current Learning review UI writes the same value to `reviewer_notes` and
`decision_rationale` as a bridge. Post-pilot, the UI should split these fields:
notes for free-form reviewer context, rationale for the accountable decision
basis.

## Evidence Epoch

Attempts, certifications, and decisions recorded before the Evidence Foundation
migration have no version pinning and no platform ledger events. Absence of
version-pinned evidence before this migration is an epoch boundary, not an
anomaly.

## Agentic Governance Roadmap

The event envelope is intentionally agent-ready without implementing agents.
`actor_kind` includes `agent`, `actor_id` can remain null until a first-class
Actor table exists, and subject fields are text so future aggregates can become
event subjects without reshaping this ledger.

Future product direction: AI agents may need credentials in the same way people
need credentials. An "AI-rijbewijs voor agents" would certify that an agent is
allowed to perform scoped actions under human or organizational delegation,
based on version-pinned assessments, expiring credentials, policy gates, and
ledgered evidence. That is roadmap, not current implementation.

## Validation Boundary

This migration may be rehearsed against local or staging databases only. It must
not be applied to production Supabase main without a separate live migration
approval and a fresh go/no-go check.
