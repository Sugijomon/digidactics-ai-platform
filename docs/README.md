# Project Docs

This folder is the durable project memory for the Digidactics AI Platform.

Use these documents to transfer context between laptops, Codex sessions, ChatGPT conversations, and future contributors.

## Core Documents

- `sai-product-readme.md` - compact product overview and truth hierarchy for the Shadow AI Scan / SAI.
- `architecture.md` - technical architecture and repo structure.
- `domain-decisions.md` - durable product, domain, compliance, and architecture decisions.
- `development-workflow.md` - how Codex, ChatGPT, GitHub, Vercel, and Supabase are used together.
- `sai-build-plan.md` - practical build sequence and implementation checklist for SAI.
- `risk-engine-spec.md` - Shadow AI Scan scoring and risk logic.
- `survey-flow-spec.md` - respondent survey flow, terminology, and implementation notes.
- `database-model.md` - active product-level database model before executable migrations.
- `toolpicker-update-process.md` - maintenance process for toolpicker, mappings, and future risk enrichment.

## Document Governance

Each document should have one primary function. Each domain topic should have one leading source.

Use this rule of thumb:

- product positioning and scope: `sai-product-readme.md`
- durable decisions: `domain-decisions.md`
- technical architecture: `architecture.md`
- survey flow: `survey-flow-spec.md`
- data model: `database-model.md`
- scoring logic: `risk-engine-spec.md`
- toolpicker and mapping maintenance: `toolpicker-update-process.md`
- implementation workflow: `development-workflow.md`
- practical build tracking: `sai-build-plan.md`

When a decision changes, update the leading source first. Then update only the documents that explicitly depend on it.

Historical documents, Lovable exports, and older source material may be kept locally or under `references/` when needed, but they are not active product specifications.

Current source references include:

- `references/source-docs/sai/methodology/Shadow_AI_Scan_Scoring_V8_1.docx` - original V8.1 methodology source for scoring, safeguards, and DPO interpretation.

Rule of thumb: if a decision would be painful to rediscover later, document it here.
