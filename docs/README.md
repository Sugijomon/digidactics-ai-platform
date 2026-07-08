# Project Docs

This folder is the durable project memory for the Digidactics AI Platform.

Use these documents to transfer context between laptops, Codex sessions, ChatGPT conversations, and future contributors.

## Core Documents

- `sai-product-readme.md` - compact product overview and truth hierarchy for the Shadow AI Scan / SAI.
- `architecture.md` - technical architecture and repo structure.
- `architecture/` - canonical product and information architecture for the shared RouteAI/SAI domain model.
- `adr/architecture-decision-register.md` - N-numbered product architecture decisions for the promoted architecture canon.
- `auth-foundation.md` - prepared authentication direction for Next.js App Router and Supabase SSR.
- `domain-decisions.md` - durable product, domain, compliance, and architecture decisions.
- `development-workflow.md` - how Codex, ChatGPT, GitHub, Vercel, and Supabase are used together.
- `sai-build-plan.md` - practical build sequence and implementation checklist for SAI.
- `risk-engine-spec.md` - Shadow AI Scan scoring and risk logic.
- `rpc-flow-contract.md` - respondent RPC write contract between frontend and Supabase.
- `survey-flow-spec.md` - respondent survey flow, terminology, and implementation notes.
- `database-model.md` - active product-level database model before executable migrations.
- `toolpicker-update-process.md` - maintenance process for toolpicker, mappings, and future risk enrichment.
- `roadmap/` - future architecture notes that are canonically scoped as roadmap, not current implementation.
- `reference/` - review and acceptance records that explain why canon changed, without becoming implementation specs.

## Source Of Truth

Architecture canon lives in `docs/architecture/`, with product architecture decisions in `docs/adr/`. Desktop files, downloads, Fable notes, and local working folders are founder drafts unless their content is present here. When repo docs conflict with code or implementation ADRs, the active branch is the implementation truth; report the mismatch and never silently resolve it.

## Document Governance

Each document should have one primary function. Each domain topic should have one leading source.

Use this rule of thumb:

- product positioning and scope: `sai-product-readme.md`
- shared product/information architecture: `architecture/`
- architecture decision register: `adr/architecture-decision-register.md`
- durable decisions: `domain-decisions.md`
- technical architecture: `architecture.md`
- authentication foundation: `auth-foundation.md`
- survey flow: `survey-flow-spec.md`
- data model: `database-model.md`
- scoring logic: `risk-engine-spec.md`
- respondent RPC contract: `rpc-flow-contract.md`
- toolpicker and mapping maintenance: `toolpicker-update-process.md`
- implementation workflow: `development-workflow.md`
- practical build tracking: `sai-build-plan.md`

Supabase migration and validation notes live in `supabase/README.md`.

When a decision changes, update the leading source first. Then update only the documents that explicitly depend on it.

Historical documents, Lovable exports, and older source material may be kept locally or under `references/` when needed, but they are not active product specifications.

Current source references include:

- `references/source-docs/sai/methodology/Shadow_AI_Scan_Scoring_V8_1.docx` - original V8.1 methodology source for scoring, safeguards, and DPO interpretation.

Rule of thumb: if a decision would be painful to rediscover later, document it here.
