# Architecture

## Strategic Direction

The platform starts with SAI: Shadow AI Scan and AI Literacy intake.

SAI will later grow into, or connect directly with, RAI / RouteAI: the broader Responsible AI governance platform.

Commercially, SAI can be sold as a focused scan product. Technically, SAI is built as the first module of the larger platform.

Core principle:

```txt
SAI apart verkopen, maar niet apart bouwen.
```

## Repository Model

This repository uses a lean monorepo model. In phase 1, only SAI is built as a real Next.js app. RAI and marketing are future platform surfaces and should not be scaffolded as full apps until SAI is stable.

```txt
digidactics-ai-platform/
  apps/
    sai/
  packages/
    auth/
    database/
    domain/
    ui/
    config/
  supabase/
    migrations/
  docs/
  design-html/
    sai/
  references/
```

Future app folders:

```txt
apps/rai
apps/marketing
```

These are documented as future surfaces, not maintained as placeholder applications in phase 1.

## Apps

### `apps/sai`

The first product surface:

- Shadow AI Scan
- AI Literacy / awareness intake
- survey flow
- tool-use inventory
- account type and data exposure capture
- risk scoring
- DPO dashboard light
- report/export later

### `apps/rai`

Future app. The broader RouteAI platform, added later:

- organization AI policy
- tool approval workflows
- model/tool library
- AI Act risk register
- evidence management
- accountability passport
- governance workflows
- training and proficiency dashboards

### `apps/marketing`

Future app. Optional Next.js marketing surface. Marketing can remain outside this monorepo for now if WordPress/DigitalOcean stays in place.

## Design Prototypes And References

### `design-html/sai`

Stores high-fidelity HTML prototypes for SAI dashboards and flows.

These files are design references, not production code. They are the visual source of truth while React components are built in `apps/sai`.

### `references`

Stores source material and historical references such as Lovable exports, RouteAI source notes, architecture documents, and research inputs.

References are read-only context. Decisions and active product specifications must live in `docs/`.

## Shared Packages

### `packages/domain`

All reusable domain logic:

- risk engine
- scoring
- EU AI Act assumptions
- policy status logic
- tool status logic
- governance rules

Examples:

```txt
calculateShadowScore()
calculateExposureScore()
calculatePriorityScore()
classifyToolStatus()
detectHighRiskSignal()
```

### `packages/database`

Supabase and database access:

- generated database types
- browser/server Supabase clients where shared
- query helpers
- repository functions
- table-specific access helpers

### `packages/auth`

Shared auth and role logic:

- roles
- permissions
- org membership helpers
- server-side auth helpers
- session helpers

### `packages/ui`

Shared UI primitives:

- buttons
- cards
- badges
- risk pills
- dashboard KPI cards
- question cards
- table primitives

SAI and RAI should share a visual language, while allowing different product complexity.

## Next.js App Router

SAI uses the Next.js App Router:

```txt
apps/sai/
  app/
    layout.tsx
    page.tsx
    scan/
      page.tsx
      actions.ts
    dashboard/
      page.tsx
    admin/
      shadow/
        activatie/
          page.tsx
        tools/
          page.tsx
        risicoprofiel/
          page.tsx
  components/
  lib/
  types/
```

Routes, layouts, and server-side data loading belong in `app/`.

App-specific components belong in the app's `components/`.

Reusable logic belongs in `packages/`.

## Server And Client Boundary

Server-side:

- auth/session checks
- trusted Supabase reads/writes
- scan submission
- risk scoring
- audit/event logging
- route handlers
- server actions

Client-side:

- multi-step scan interaction
- form state
- filters
- dropdowns
- charts
- drawers/modals
- temporary UI state

Risk scoring must not depend solely on client-side execution.

## Supabase

The platform uses one shared Supabase database designed modularly for SAI and RAI.

SAI initially needs:

- organizations
- user profiles / memberships
- scan campaigns
- survey runs/responses
- survey tools/use cases/contexts/data types
- risk results
- tool catalog / org tool catalog

RAI later adds:

- policies
- policy rules
- policy exceptions
- evidence files
- audit events
- training modules
- model/typekaart library
- governance workflows

RLS is mandatory for all product tables.

## Deployment

In phase 1, only SAI is deployed from the monorepo:

```txt
Vercel project: sai -> Root Directory: apps/sai
```

Later, Vercel can use separate projects per app inside the same monorepo:

```txt
Vercel project: rai -> Root Directory: apps/rai
Vercel project: marketing -> Root Directory: apps/marketing
```

This allows independent deployments from one shared codebase.
