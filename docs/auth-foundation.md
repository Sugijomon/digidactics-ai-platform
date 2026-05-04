# Authentication Foundation

Status: prepared decision note, not yet implemented.

This document records the authentication direction for the future Next.js App
Router implementation of the Digidactics AI Platform and Shadow AI Scan.

## Timing

Authentication is not required before writing the database migrations and RPC
contracts, but it is required before building the real Next.js application
shell, protected dashboards, admin routes, and logged-in survey flows.

Recommended sequence:

1. Finalize database migrations and RPC contracts.
2. Add the Next.js app foundation.
3. Implement authentication with `@supabase/ssr`.
4. Build role-based routing and protected layouts.
5. Connect survey and dashboard flows to the secured Supabase/RPC layer.

## Supabase Client Strategy

Use `@supabase/ssr`, not only the regular browser client.

The Next.js App Router needs separate Supabase clients for different runtime
contexts:

```txt
lib/supabase/server.ts      -> Server Components and Route Handlers
lib/supabase/client.ts      -> Client Components
middleware.ts               -> request-level session refresh
```

The root-level `middleware.ts` is required. Without it, sessions may not refresh
reliably and users can appear logged out while a valid session still exists.

## Existing Role Schema

Do not change the existing Supabase role schema for SAI MVP.

Existing assumptions:

```txt
app_role enum:
  super_admin
  content_editor
  org_admin
  dpo
  manager
  user

user_roles:
  id
  user_id -> auth.users
  org_id -> organizations
  role -> app_role
  created_at

user_profiles:
  id -> auth.users.id
  org_id
  display_name
  email
```

For the SAI MVP, the active roles are:

```txt
super_admin -> platform administration
dpo         -> customer-side scan owner / DPO workflow
user        -> respondent or regular user flow
```

`org_admin`, `manager`, and `content_editor` remain available for RouteAI
Platform functionality and upgrade paths. Do not remove them.

Do not add a legal/juridical role yet. Add it only when the role's permissions,
visibility, and responsibility are fully specified.

## Role Loading

Rebuild the Lovable role helpers in Next.js instead of changing the database.

Server-side:

- Add `lib/supabase/get-user-role.ts`.
- Read the authenticated user's role from `user_roles`.
- Use this helper in Server Components, Route Handlers, and protected layouts.
- Treat server-side role checks as authoritative.

Client-side:

- Add an `AuthProvider` Client Component.
- Add a `useAuth` hook that reads from the provider.
- Use the client context for UI state, not for security boundaries.

Future role comment for `get-user-role.ts`:

```ts
// Future roles: manager, content_editor, juridisch.
// Add routing and permissions when RouteAI Platform functionality is active.
```

## Routing After Login

The existing routing model can be translated directly to Next.js middleware.

Target routing:

```txt
super_admin                   -> /super-admin
org_admin + shadow_only       -> /admin/shadow
org_admin + routeai or both   -> /admin
dpo                           -> /admin/shadow
user + shadow_only            -> /shadow-survey
user + routeai or both        -> /dashboard
```

Unknown or future roles must not crash the middleware. Use a safe fallback:

```ts
// Unknown or future roles -> fallback
default: redirect('/dashboard')
```

This keeps the SAI foundation stable now and avoids a rewrite when RouteAI
Platform roles become active later.

## SAI Auth Methods

For the Shadow AI Scan, the required auth methods are:

- Magic link / OTP invite
- Google OAuth
- Apple Sign-In

Microsoft can remain a placeholder until explicitly needed.

Supabase OAuth providers do not need to be rebuilt. For the new deployment,
update provider settings and redirect URLs to the new Vercel domain.

## Starter Implementation Prompt

Use this when the Next.js project shell is ready:

```txt
Build the auth foundation for a Next.js 14 App Router project with Supabase.
Use @supabase/ssr.

Requirements:
- lib/supabase/server.ts: createServerClient for Server Components.
- lib/supabase/client.ts: createBrowserClient for Client Components.
- middleware.ts at root level: refresh the Supabase session on every request.
- lib/supabase/get-user-role.ts: server-side helper that reads app_role from
  user_roles for the logged-in user.
- AuthProvider as a Client Component context that exposes the current user and
  role.
- useAuth hook that reads AuthProvider.

Database assumptions:
- app_role enum: super_admin, content_editor, org_admin, dpo, manager, user.
- user_roles table: id, user_id, org_id, role, created_at.
- user_profiles table: id, org_id, display_name, email.

Routing after login:
- super_admin -> /super-admin
- org_admin with shadow_only -> /admin/shadow
- org_admin with routeai or both -> /admin
- dpo -> /admin/shadow
- user with shadow_only -> /shadow-survey
- user with routeai or both -> /dashboard
- unknown or future role -> /dashboard

Do not create new tables. The schema already exists in Supabase.
Write TypeScript and do not use any types.
```

## Relationship To RLS And RPCs

The authentication layer does not replace RLS.

RLS remains the database boundary. Next.js middleware and server helpers decide
which UI and routes load; Supabase RLS and SECURITY DEFINER RPCs still enforce
what data can be read or written.

For anonymous respondent survey links, continue using the token/RPC model from
the RLS design. Authenticated user roles are mainly relevant for DPO/admin
dashboards, organization management, and logged-in platform routes.
