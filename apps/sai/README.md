# SAI Next.js App

This is the Shadow AI Scan frontend for the Digidactics AI Platform.

## Environment

Create `apps/sai/.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not add a `service_role` key to frontend or client-visible environment files.

## Local Development

From the repository root:

```bash
corepack pnpm --dir apps/sai dev
corepack pnpm --dir apps/sai lint
corepack pnpm --dir apps/sai build
```

If `pnpm` is available on PATH, the root scripts can also be used:

```bash
pnpm dev:sai
pnpm lint:sai
pnpm build:sai
```

## Auth Foundation

The app uses `@supabase/ssr` for Next.js App Router auth:

- `lib/supabase/client.ts` creates the browser client for Client Components.
- `lib/supabase/server.ts` creates the server client for Server Components, Server Actions, and Route Handlers.
- `proxy.ts` refreshes Supabase auth cookies for requests.
- `lib/supabase/get-user-role.ts` loads the authenticated user's `role` and `org_id` from `public.user_roles`.
- `components/auth-provider.tsx` and `hooks/use-auth.ts` expose client-side auth state for UI only.

Server-side role checks remain authoritative. Client auth state is only for rendering UI state.

## RLS And RPC Boundary

RLS remains the database security boundary.

Anonymous respondent survey writes must go through the safe RPC flow documented in `docs/rpc-flow-contract.md`. Do not write directly from anon clients to survey tables. The respondent flow should keep `run_id` and `submission_token` only as active survey state and clear the token after completion.

For manual development checks, open `/dev/rpc`. It runs the minimal respondent RPC smoke flow with the default `sai-smoke-wave-token` and masks the submission token in the UI.
