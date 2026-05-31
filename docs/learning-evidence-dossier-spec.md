# Learning Evidence Dossier Spec

Status: draft for DPO/legal review
Last verified: 2026-05-29
Source of truth in code: `apps/rai/lib/learning-governance-config.ts`

## Purpose

The Evidence Dossier should prove that the organisation offered structured AI literacy support and that the learner completed the relevant course evidence. It is internal compliance evidence, not an external licence or a legal guarantee.

## Draft Export Fields

| Field | Purpose | DPO decision needed |
|---|---|---|
| learner_id | Link progress and certificate to the correct user. | Yes |
| org_id | Separate evidence per organisation. | Yes |
| course_code | Identify the completed module. | No |
| course_version | Reproduce the content version used for assessment. | No |
| started_at | Show participation period. | No |
| completed_at | Show completion date. | No |
| attempts | Prove exercise and assessment attempts. | Yes |
| score_summary | Show pass threshold outcome without overexposing raw answers. | Yes |
| manual_review_status | Show whether open answers/cases were reviewed. | No |
| certificate_status | Show active, expired, revoked or superseded status. | No |
| last_verified_at | Show when sources/rules for this version were checked. | No |

## Open DPO Decisions

- Retention period for attempts, raw answers, scores and certificates.
- Which admin roles may export raw answers versus score summaries.
- Whether learners can download their own dossier and whether exports need masking.
- Deletion/anonymisation behaviour when a user leaves an organisation.
- Audit logging for exports and certificate status changes.

## Implementation Notes

- Course content can mark blocks with `review_required`, `review_tags` and `evidence_dossier_fields`.
- DPO-sensitive blocks should use tags such as `privacy`, `dpo`, `hr`, `finance`, `toolscope` and `evidence_dossier`.
- Provisional legal claims must include `source_ids`, `source_status`, `last_verified_at`, `provisional: true` and `legal_review_required: true`.
