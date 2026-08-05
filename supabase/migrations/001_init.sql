-- Scheduler Needs Material — initial schema
-- Phase 3 database foundation. UI is unchanged; app still uses sample data until later phases.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- allowed_users
-- ---------------------------------------------------------------------------

create table public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  role text not null,
  status text not null default 'pending',
  invited_at timestamptz,
  accepted_at timestamptz,
  disabled_at timestamptz,
  created_by uuid references public.allowed_users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint allowed_users_email_unique unique (email),
  constraint allowed_users_email_format check (position('@' in email) > 1),
  constraint allowed_users_role_check check (
    role in ('administrator', 'purchasing', 'scheduler', 'viewer')
  ),
  constraint allowed_users_status_check check (
    status in ('active', 'pending', 'disabled')
  )
);

create index allowed_users_role_idx on public.allowed_users (role);
create index allowed_users_status_idx on public.allowed_users (status);

create trigger allowed_users_set_updated_at
before update on public.allowed_users
for each row
execute function public.set_updated_at();

comment on table public.allowed_users is
  'Dashboard allowlist. Users must authenticate with Microsoft later and also exist here.';

-- ---------------------------------------------------------------------------
-- needs_material (parent work order)
-- Scheduler-controlled fields may be overwritten by SharePoint refresh.
-- Owner and follow-up notes are dashboard-controlled and never overwritten.
-- Material purchasing detail lives in material_lines (child rows).
-- ---------------------------------------------------------------------------

create table public.needs_material (
  id uuid primary key default gen_random_uuid(),

  -- Scheduler-controlled (SharePoint source of truth on refresh)
  work_order text not null,
  customer_po text,
  customer text,
  order_date date,
  due_date date,
  esd date,
  part_number text,
  description text,
  quantity numeric,
  production_status text,

  -- Dashboard-controlled on the parent (preserved across refresh)
  owner text,
  follow_up_notes text,

  -- Lifecycle
  active boolean not null default true,
  source_last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint needs_material_work_order_unique unique (work_order)
);

create index needs_material_active_idx on public.needs_material (active);
create index needs_material_due_date_idx on public.needs_material (due_date);
create index needs_material_customer_idx on public.needs_material (customer);
create index needs_material_owner_idx on public.needs_material (owner);
create index needs_material_production_status_idx on public.needs_material (production_status);

create trigger needs_material_set_updated_at
before update on public.needs_material
for each row
execute function public.set_updated_at();

comment on table public.needs_material is
  'Parent work order for Need Material. work_order is unique for v1. Never delete rows; set active = false when no longer Need Material. Child material detail is in material_lines.';

comment on column public.needs_material.work_order is 'Scheduler-controlled. Unique match key for SharePoint refresh.';
comment on column public.needs_material.customer_po is 'Scheduler-controlled.';
comment on column public.needs_material.customer is 'Scheduler-controlled.';
comment on column public.needs_material.order_date is 'Scheduler-controlled.';
comment on column public.needs_material.due_date is 'Scheduler-controlled.';
comment on column public.needs_material.esd is 'Scheduler-controlled.';
comment on column public.needs_material.part_number is 'Scheduler-controlled.';
comment on column public.needs_material.description is 'Scheduler-controlled.';
comment on column public.needs_material.quantity is 'Scheduler-controlled.';
comment on column public.needs_material.production_status is 'Scheduler-controlled.';
comment on column public.needs_material.owner is 'Dashboard-controlled. Never overwrite on SharePoint refresh.';
comment on column public.needs_material.follow_up_notes is 'Dashboard-controlled. Never overwrite on SharePoint refresh.';

-- ---------------------------------------------------------------------------
-- material_lines (child purchasing lines under a work order)
-- Zero or more lines per needs_material row. Category is Flats or Shapes.
-- Never overwritten by SharePoint refresh.
-- ---------------------------------------------------------------------------

create table public.material_lines (
  id uuid primary key default gen_random_uuid(),
  needs_material_id uuid not null references public.needs_material (id) on delete cascade,
  material_category text not null,
  material_type text,
  supplier text,
  material_po text,
  ead date,
  status text not null default 'Not Ordered',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint material_lines_category_check check (
    material_category in ('Flats', 'Shapes')
  ),
  constraint material_lines_status_check check (
    status in (
      'Not Ordered',
      'Quote Requested',
      'PO Issued',
      'Supplier Confirmed',
      'In Transit',
      'Partially Received',
      'Received',
      'Problem / Escalation'
    )
  )
);

create index material_lines_needs_material_id_idx
  on public.material_lines (needs_material_id);
create index material_lines_category_idx
  on public.material_lines (material_category);
create index material_lines_status_idx
  on public.material_lines (status);
create index material_lines_parent_category_sort_idx
  on public.material_lines (needs_material_id, material_category, sort_order);

create trigger material_lines_set_updated_at
before update on public.material_lines
for each row
execute function public.set_updated_at();

comment on table public.material_lines is
  'Child material purchasing lines for a Need Material work order. Dashboard-controlled; never overwritten by SharePoint refresh.';
comment on column public.material_lines.material_category is 'Flats or Shapes.';
comment on column public.material_lines.material_type is 'Manual text entry for the material type.';
comment on column public.material_lines.supplier is 'Dashboard-controlled. Never overwrite on SharePoint refresh.';
comment on column public.material_lines.material_po is 'Dashboard-controlled. Never overwrite on SharePoint refresh.';
comment on column public.material_lines.ead is 'Expected arrival date (EAD). Dashboard-controlled. Never overwrite on SharePoint refresh.';
comment on column public.material_lines.status is 'Per-line purchasing status. Dashboard-controlled. Never overwrite on SharePoint refresh. Default Not Ordered.';

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.allowed_users (id) on delete set null,
  action text not null,
  record_type text not null,
  record_id uuid,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_log_user_id_idx on public.audit_log (user_id);
create index audit_log_record_idx on public.audit_log (record_type, record_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

comment on table public.audit_log is
  'Append-only change history for dashboard edits and admin actions.';

-- ---------------------------------------------------------------------------
-- refresh_history
-- ---------------------------------------------------------------------------

create table public.refresh_history (
  id uuid primary key default gen_random_uuid(),
  refresh_type text not null,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  status text not null default 'running',
  rows_read integer not null default 0,
  rows_created integer not null default 0,
  rows_updated integer not null default 0,
  rows_archived integer not null default 0,
  error_message text,
  triggered_by uuid references public.allowed_users (id) on delete set null,
  constraint refresh_history_type_check check (
    refresh_type in ('manual', 'scheduled')
  ),
  constraint refresh_history_status_check check (
    status in ('running', 'success', 'failed')
  )
);

create index refresh_history_started_at_idx on public.refresh_history (started_at desc);
create index refresh_history_status_idx on public.refresh_history (status);
create index refresh_history_triggered_by_idx on public.refresh_history (triggered_by);

comment on table public.refresh_history is
  'SharePoint refresh runs (manual Refresh Now and scheduled 10:00 AM America/Chicago).';

-- ---------------------------------------------------------------------------
-- Row Level Security (conservative)
--
-- Until Microsoft authentication is wired to Supabase Auth (or an equivalent
-- JWT claims bridge), the Next.js server will use the Supabase service role
-- key for all database access. Service role bypasses RLS.
--
-- Policies finalized later (Phase 4+):
-- - Map Entra-authenticated users to allowed_users
-- - Permit select/update based on role (administrator, purchasing, scheduler, viewer)
-- - Restrict invite/admin mutations to administrator
-- - Restrict manual refresh to administrator and scheduler
--
-- For now: enable RLS on every table and grant no policies to anon/authenticated,
-- so the public anon key cannot read or write application data.
-- ---------------------------------------------------------------------------

alter table public.allowed_users enable row level security;
alter table public.needs_material enable row level security;
alter table public.material_lines enable row level security;
alter table public.audit_log enable row level security;
alter table public.refresh_history enable row level security;

alter table public.allowed_users force row level security;
alter table public.needs_material force row level security;
alter table public.material_lines force row level security;
alter table public.audit_log force row level security;
alter table public.refresh_history force row level security;

-- Explicitly revoke table privileges from Supabase API roles when present.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.allowed_users from anon';
    execute 'revoke all on table public.needs_material from anon';
    execute 'revoke all on table public.material_lines from anon';
    execute 'revoke all on table public.audit_log from anon';
    execute 'revoke all on table public.refresh_history from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.allowed_users from authenticated';
    execute 'revoke all on table public.needs_material from authenticated';
    execute 'revoke all on table public.material_lines from authenticated';
    execute 'revoke all on table public.audit_log from authenticated';
    execute 'revoke all on table public.refresh_history from authenticated';
  end if;
end $$;

-- No CREATE POLICY statements for anon/authenticated in this migration.
-- Service-role access from the Next.js server is intentional until auth is implemented.
