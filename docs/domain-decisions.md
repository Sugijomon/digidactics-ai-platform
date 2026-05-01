# Domain Decisions

This document records durable decisions for the Digidactics AI Platform. Codex and ChatGPT conversations are not durable project memory; decisions that affect product behavior, compliance logic, architecture, schema, RLS, scoring, or dashboard language must be captured here.

## Decision: GitHub Is The Source Of Truth

GitHub is the source of truth for:

- code
- schema
- migrations
- product decisions
- domain decisions
- risk-engine specifications
- architecture notes
- deployment workflow

Codex local sessions and ChatGPT mobile conversations are temporary working context.

Any decision that affects risk scoring, EU AI Act interpretation, Supabase schema/RLS, dashboard KPIs, user-facing governance language, auditability, or evidence storage must be documented in this repository.

## Decision: Use A Monorepo For SAI And RAI

SAI will be developed as the first product/module of the broader RAI / RouteAI platform, not as a separate throwaway application.

The codebase will use a monorepo structure with separate Next.js apps under `apps/` and shared packages under `packages/`.

SAI and RAI will share:

- Supabase database schema
- organization and user model
- auth and role model
- tool catalog
- risk engine
- EU AI Act domain logic
- UI primitives
- audit/event model

SAI exposes a simpler product surface focused on Shadow AI Scan and AI Literacy intake.

RAI later exposes the broader governance platform, including policy management, evidence, dashboards, risk register, model library, training, and compliance workflows.

Rationale:

- prevents rebuilding SAI when moving toward RAI
- keeps scoring and governance logic consistent
- supports commercial separation while preserving technical coherence
- enables shared auditability and future compliance reporting

## Decision: SAI Is Sold Separately But Not Built Separately

SAI can be marketed and sold as a focused scan product.

Technically, SAI must remain on the same foundation as RAI:

- same database
- same auth model
- same risk primitives
- same audit principles
- same reusable UI language

This avoids a future migration from a scan prototype into a governance platform.

## Decision: Next.js App Router And Server/Client Boundary

The platform uses Next.js App Router.

Server Components, server actions, and route handlers are used for:

- authentication checks
- Supabase reads/writes
- scan submission
- risk scoring
- audit/event logging
- API routes and external integrations

Client Components are used for:

- interactive scan flow
- form state
- filters
- charts
- drawers/modals
- dropdowns
- temporary UI state

Risk scoring must not rely solely on client-side execution.

## Decision: Use `@supabase/ssr` For Next.js Auth

The platform uses `@supabase/ssr` for Supabase auth in Next.js.

Required structure:

```txt
packages/auth/
packages/database/
apps/sai/middleware.ts or root middleware.ts
```

Each app needs correct handling for:

- browser client for Client Components
- server client for Server Components and Route Handlers
- middleware/session refresh on requests
- server-side role lookup

This prevents auth bugs where the user appears logged out even though the Supabase session is still valid.

## Decision: Roles Are Prepared But Not Prematurely Expanded

Existing roles from the current Supabase/Lovable model may be reused:

- `super_admin`
- `content_editor`
- `org_admin`
- `dpo`
- `manager`
- `user`

For the Shadow AI Scan MVP, only these are actively required:

- `super_admin`
- `dpo`
- `user`

`org_admin`, `manager`, and `content_editor` are RouteAI platform roles and should be supported without forcing them into the first SAI workflows.

A future legal role should not be added until its permissions and product responsibilities are clear.

Unknown or future roles should fall back safely, for example to `/dashboard`, without crashing routing logic.

## Decision: Keep Legal And Governance Concepts Separate

Unknown tools are not automatically prohibited.

`org_policy_status` must remain separate from EU AI Act prohibited/high-risk signals.

GPAI status is descriptive metadata and does not by itself determine the user route or risk tier.

Risk emerges from combinations of:

- tool status
- use case
- data type
- account type
- context
- frequency
- automation
- browser extension use
- governance maturity

UI copy must not present legal conclusions without documented rationale.

