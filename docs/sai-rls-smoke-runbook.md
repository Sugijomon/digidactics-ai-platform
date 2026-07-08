# SAI RLS Role Matrix Smoke Runbook

Status: staging/local runbook for
`supabase/smoke-tests/20260708120000_rls_role_matrix_smoke.sql`.

This runbook makes step 3 of the SAI production-readiness work executable: it
tells you exactly which staging test users to create, exactly which
`public.user_roles` rows to insert, exactly which `psql` variables the smoke
test needs, and how to run it safely against a local or staging Supabase
project only.

Do not run any part of this runbook against a production Supabase project.

## 1. Why four separate users, not one

`public.user_roles` (legacy table, not defined in `supabase/migrations/`) has
constraint `UNIQUE (user_id, role)` and columns `id, user_id, role, created_at,
org_id`. A single `user_id` can only hold **one row per role**, and role rows
are not org-scoped beyond the `org_id` column on that single row. To exercise
the role matrix (dpo / org_admin / user / super_admin) you need **four
separate Supabase Auth users**, each with exactly one `user_roles` row.

## 2. Required staging test users

Create these in Supabase Auth (Studio > Authentication > Users > Add user, or
`supabase auth admin` on your staging project). Use a clearly-marked staging
email convention so nobody mistakes these for real pilot accounts.

| Role          | Suggested email                        | Org                          |
|---------------|-----------------------------------------|-------------------------------|
| `dpo`         | `dpo@sai-rls-smoke.staging.invalid`      | smoke org (`smoke_org_id`)   |
| `org_admin`   | `org-admin@sai-rls-smoke.staging.invalid`| smoke org (`smoke_org_id`)   |
| `user`        | `user@sai-rls-smoke.staging.invalid`     | smoke org (`smoke_org_id`)   |
| `super_admin` | `super-admin@sai-rls-smoke.staging.invalid` | any org (role is global) |

`*.invalid` is a reserved TLD (RFC 2606) that will never resolve or deliver
mail — safe to use for accounts that only exist to prove RLS behavior.

After creating each user, copy their `auth.users.id` (shown in Supabase
Studio) — you need all four UUIDs for step 3 and 4 below.

## 3. Required organizations

The smoke test needs **two different organizations** so it can prove a DPO or
org-admin from org A cannot read org B's data.

- `smoke_org_id`: reuse the existing deterministic
  `SAI Smoke Test Organisatie` (`00000000-0000-0000-0000-000000000101`,
  seeded by `supabase/seed/20260504141000_sai_smoke_seed.sql`), **or** the
  `SAI Synthetic Pilot Organisatie`
  (`00000000-0000-0000-0000-000000000301`, see
  [`docs/sai-synthetic-pilot-organisatie.md`](sai-synthetic-pilot-organisatie.md))
  if you want richer dashboard data behind the RLS check.
- `other_org_id`: any second organization that exists in the same staging
  project. If you only have one test org, create a minimal second one first:

```sql
insert into public.organizations (id, name, plan_type)
values (gen_random_uuid(), 'SAI RLS Smoke Other Org', 'shadow_only');
```

Both organizations must already have at least one `survey_run` row before you
run the smoke test (the preflight check in section `0` of the SQL file
requires it for `smoke_org_id`). Complete one respondent run through
`/survey` against the staging wave token, or run the synthetic-flow script
from [`docs/sai-synthetic-flow-testplan.md`](sai-synthetic-flow-testplan.md)
first.

## 4. Exact `public.user_roles` rows to insert

Run this against staging/local only, after you have the four `auth.users.id`
values and both org ids. Replace every `<...>` placeholder.

```sql
-- LOCAL/STAGING ONLY — do NOT run in production.
insert into public.user_roles (user_id, org_id, role)
values
  ('<dpo_user_id>',         '<smoke_org_id>', 'dpo'),
  ('<org_admin_user_id>',   '<smoke_org_id>', 'org_admin'),
  ('<regular_user_id>',     '<smoke_org_id>', 'user'),
  ('<super_admin_user_id>', '00000000-0000-0000-0000-000000000001', 'super_admin')
on conflict (user_id, role) do update set
  org_id = excluded.org_id;
```

Notes:

- `org_id` for `super_admin` does not need to be the smoke org —
  `is_super_admin(uuid)` checks `role = 'super_admin'` only, not `org_id`. The
  default org id (`00000000-0000-0000-0000-000000000001`) is the
  `user_roles.org_id` column default from the legacy schema and is a safe,
  neutral value to use here.
- The `enforce_org_admin_limit` trigger caps `org_admin` rows to 2 per org, so
  this insert will not conflict with existing org-admins unless the smoke org
  already has two.

## 5. Exact `psql` variables the smoke test needs

`supabase/smoke-tests/20260708120000_rls_role_matrix_smoke.sql` requires:

| Variable              | 1-line meaning                                                        |
|------------------------|------------------------------------------------------------------------|
| `smoke_org_id`         | Organization the DPO/org-admin/user test accounts belong to. Defaults to `00000000-0000-0000-0000-000000000101` if omitted. |
| `other_org_id`         | A **different**, existing organization — proves cross-tenant RLS denial. Required, no default. |
| `dpo_user_id`          | `auth.users.id` of the account with a `dpo` row in `smoke_org_id`. Required. |
| `org_admin_user_id`    | `auth.users.id` of the account with an `org_admin` row in `smoke_org_id`. Required. |
| `regular_user_id`      | `auth.users.id` of the account with a `user` row in `smoke_org_id`. Required. |
| `super_admin_user_id`  | `auth.users.id` of the account with a `super_admin` row (any org). Required. |

## 6. Running it directly with `psql`

```bash
psql "<staging-db-url>" -v ON_ERROR_STOP=1 \
  -v smoke_org_id=00000000-0000-0000-0000-000000000101 \
  -v other_org_id=<different-existing-org-id> \
  -v dpo_user_id=<dpo-auth-user-id> \
  -v org_admin_user_id=<org-admin-auth-user-id> \
  -v regular_user_id=<regular-auth-user-id> \
  -v super_admin_user_id=<super-admin-auth-user-id> \
  -f supabase/smoke-tests/20260708120000_rls_role_matrix_smoke.sql
```

The script only uses `BEGIN READ ONLY ... ROLLBACK` blocks — it never mutates
product data.

## 7. Running it through the guarded wrapper

Use `supabase/smoke-tests/run-rls-role-matrix-smoke.sh` instead of calling
`psql` directly if you want an explicit production guard. The wrapper refuses
to run unless:

- the database host looks local (`localhost`, `127.0.0.1`, `::1`), **or**
- you pass `--i-know-this-is-staging` explicitly.

```bash
supabase/smoke-tests/run-rls-role-matrix-smoke.sh \
  --db-url "<staging-db-url>" \
  --i-know-this-is-staging \
  --other-org-id <different-existing-org-id> \
  --dpo-user-id <dpo-auth-user-id> \
  --org-admin-user-id <org-admin-auth-user-id> \
  --regular-user-id <regular-auth-user-id> \
  --super-admin-user-id <super-admin-auth-user-id>
```

Run `supabase/smoke-tests/run-rls-role-matrix-smoke.sh --help` for the full
flag list, including `--smoke-org-id` (optional override).

The wrapper cannot reliably distinguish a staging Supabase project ref from a
production one by URL shape alone — both are opaque `<ref>.supabase.co`
hosts. `--i-know-this-is-staging` is a deliberate, explicit human
confirmation step for any non-local host; it is not a technical guarantee.
Always double-check the `--db-url` you pass.

## 8. Expected result

```txt
RLS role matrix smoke passed
```

If any step raises an exception instead, the RLS role matrix has regressed —
treat it as a release blocker per
[`docs/sai-production-release-checklist.md`](sai-production-release-checklist.md)
section 3.
