# Auth, Roles, And Entry Routing

Status: architecture note v0.1, based on the Lovable export and current RAI Learning System work.

## Why This Matters Now

The Learning System is already using authenticated Supabase sessions for
enrollment and lesson progress. RouteAI will later need multiple dashboards and
role-specific entry points. This should be designed once and shared by SAI and
RAI, not duplicated per app.

The current implementation is safe as a first step because it relies on
Supabase Auth cookies and the shared database. The missing layer is a shared
role/session helper package and explicit entry routing.

## Legacy Model Reviewed

The Lovable export uses:

- `profiles`
- `organizations`
- `user_roles`
- helper functions such as `get_user_org_id`, `get_user_role`, `has_role`,
  `is_super_admin`, `is_org_admin`, `is_dpo`, `is_manager`, and
  `is_content_editor`

Roles in the legacy `app_role` enum:

- `user`
- `manager`
- `org_admin`
- `dpo`
- `content_editor`
- `super_admin`

Users can have multiple roles. The old `get_user_role` function chooses a
single primary role by priority:

1. `super_admin`
2. `content_editor`
3. `org_admin`
4. `manager`
5. `user`

The sample data confirms multi-role users, for example a user can be both
`dpo` and `user`, or `content_editor` and `user`.

## Direction For The New Stack

Keep the database model:

- Auth identity: `auth.users`
- User profile and organization: `profiles`
- Organization entity: `organizations`
- Role assignment: `user_roles`

Do not encode authorization decisions in `user_metadata`. Supabase user metadata
is user-editable and must not be trusted for RLS or server authorization. Role
and organization decisions belong in database tables and server-side helpers.

Use `@supabase/ssr` for cookie-based sessions in every Next.js app.

## Shared Auth Package

Create `packages/auth` as the shared application-facing auth layer.

It should expose:

- platform role types
- role priority ordering
- `getCurrentUserContext`
- `getPrimaryRole`
- `canAccessProduct`
- `getDefaultEntryPath`

The output should be app-neutral:

```ts
type UserContext = {
  userId: string;
  orgId: string | null;
  roles: PlatformRole[];
  primaryRole: PlatformRole | null;
  productAccess: {
    sai: boolean;
    rai: boolean;
  };
};
```

## Entry Routing

Default routing should be explicit and role-aware.

Initial proposal:

```txt
super_admin    -> /admin
content_editor -> /learning/admin
org_admin      -> /dashboard
dpo            -> /dashboard
manager        -> /dashboard
user           -> /learning
unknown        -> /learning
```

For RAI, users without AI Literacy certification may enter the Learning System
but should be blocked from RouteAI usecase checks by
`learning_check_capability_access('routeai_usecase_check')`.

For SAI, scan respondents may not always need the same full RouteAI dashboard.
SAI-specific access rules should use the same user context, but expose a simpler
surface.

## Current Gap

The RAI app now has magic-link auth and Supabase session refresh. It does not
yet have shared role lookup or default entry routing.

The next implementation step should be:

1. Build `packages/auth`.
2. Add server-side role lookup from `profiles` and `user_roles`.
3. Add `/dashboard` as a simple role-aware router in `apps/rai`.
4. Keep `/learning` as the fallback for normal users.

## Security Notes

The Supabase advisor reported that several reference tables currently have RLS
disabled in the dev branch. That is not caused by the Learning System work, but
it should be reviewed before production exposure.

Do not auto-enable RLS on reference tables without policies: doing so can break
runtime reads. The safe path is to decide which reference tables are public
read-only, authenticated read-only, or admin-managed, then add policies in a
targeted migration.

