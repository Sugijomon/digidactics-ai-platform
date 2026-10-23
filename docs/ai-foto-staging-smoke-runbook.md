# AI-Foto Staging Smoke Runbook

Status: the current pilot procedure and real browser/PDF suite are documented
in [the 23 October pilot handover](controlled-pilot-2026-10-23.md).
The SQL examples below describe the earlier preview layer; direct approval
without review and real completed source references is intentionally rejected
by the October integrity migration. Do not treat those historical smoke
examples as current release evidence.

Do not run these steps against production.

## Scope

This runbook validates the layer between completed AI-Foto survey applications
and customer-card export preparation:

- deterministic `card_item` generation;
- card item editing and consultant review;
- approval validation;
- approved-only export-preview registration;
- audit evidence in `audit_events` and `report_exports`.

The current `test:pilot` suite also validates the actual A3/PDF download and
export audit registration. The earlier preview procedure below does not.

## 1. Migration Preflight

Before applying the migrations to staging, review:

- `supabase/migrations/20260805110000_add_ai_foto_fable_analysis_layer.sql`
- `supabase/migrations/20260805123000_add_ai_foto_card_item_workflow_support.sql`

Expected checks:

- `public.card_item` exists with RLS enabled.
- `authenticated` has explicit grants on `public.card_item`.
- `anon` has no direct table grant on `public.card_item`.
- `card_item_select`, `card_item_insert`, `card_item_update`, and
  `card_item_delete` are org-scoped to DPO/org-admin or super-admin.
- `idx_card_item_ai_foto_idempotent` exists and covers org, scan wave,
  analysis version, card type, source kind, and cluster key.
- `record_ai_foto_card_item_audit(...)` revokes `PUBLIC`, `anon`, and
  `authenticated`, then grants explicit execute to `authenticated` only.
- `record_ai_foto_card_item_audit(...)` checks `auth.uid()` against
  org-admin/DPO/super-admin before inserting into `audit_events`.
- Export preview uses existing `report_exports`, not a new export table.

Supabase Data API note: new public schema objects need explicit grants before
they are reachable via `supabase-js`/PostgREST. RLS remains a separate layer.

## 2. Database Smoke SQL

Create or choose a staging DPO/org-admin Auth user and copy its
`auth.users.id`.

Run the card item workflow smoke test against local or staging:

```bash
psql "<staging-db-url>" -v ON_ERROR_STOP=1 \
  -v ai_foto_dpo_user_id=<existing-staging-auth-user-id> \
  -f supabase/smoke-tests/20260805124500_ai_foto_card_item_workflow_smoke.sql
```

Expected result:

```txt
AI-Foto card item workflow smoke passed
```

This test runs in a transaction and rolls back fixture rows. It proves:

- authenticated DPO access to own-org `card_item`;
- approval metadata constraint;
- audit RPC execution by an authorized role;
- `report_exports` preview row shape;
- audit event shape for card approval and export-preview registration;
- no anon execute privilege on the AI-Foto audit RPC.

## 3. UI Smoke Checklist

Use a staging wave with:

```txt
product_code = ai_foto
method_version = ai-foto-scan-v1
```

Complete at least one AI-Foto respondent flow, ideally enough responses to
meet the active dashboard min-cell size.

In `/dashboard/ai-foto` as DPO/org-admin:

- Open the AI-Foto dashboard and confirm the signal cards still render.
- Click `Genereer conceptkaartitems`.
- Confirm card items appear grouped under Waardekaart, Aandachtspuntenkaart,
  and Vaardighedenkaart.
- Click `Genereer conceptkaartitems` again and confirm no duplicate cluster
  items are created.
- Edit a card item:
  - title;
  - observation;
  - interpretation;
  - open questions;
  - precaution;
  - follow-up direction;
  - owner role;
  - review date;
  - evidence level.
- Save the item and refresh the dashboard.
- Mark the item as review ready.
- Try approval without interpretation on another item and confirm it fails.
- Try approval with a legal conclusion phrase such as `compliancegarantie` and
  confirm it fails.
- Approve a valid reviewed item.
- Confirm approved items become read-only in the workbench.
- Confirm export-preview metadata shows organization, scan wave, method
  version, approved item count, and selected item ids.
- Register export preview.

Database checks after the UI path:

```sql
select id, status, approved_by, approved_at
from public.card_item
where org_id = '<staging-org-id>'
order by updated_at desc;

select id, export_type, export_status, filters, row_count
from public.report_exports
where org_id = '<staging-org-id>'
  and export_type = 'ai_foto_cards'
order by created_at desc;

select event_type, subject_table, subject_id, payload, created_at
from public.audit_events
where org_id = '<staging-org-id>'
  and event_type in (
    'card_item.generated',
    'card_item.updated',
    'card_item.approved',
    'ai_foto.export_preview_recorded'
  )
order by created_at desc;
```

## 4. Release Gate

Treat staging as not ready when any of these fail:

- concept generation creates duplicate items for the same cluster;
- approved items are overwritten by regeneration;
- approval succeeds without interpretation or evidence refs;
- approval accepts legal conclusion wording;
- export preview can be registered with non-approved items;
- `report_exports.filters.card_item_ids` is missing selected item ids;
- audit events are missing actor, event type, subject table, subject id, or
  payload.

## 5. Next Layer

After this smoke path passes on staging, build the real export layer:

- A3/PDF template for the three cards;
- fixed disclaimer;
- selected approved card item ids;
- method version and analysis version metadata;
- min-cell/suppression metadata;
- durable export status transition from `preview_ready` to generated/exported.
