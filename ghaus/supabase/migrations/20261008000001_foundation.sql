-- Foundation: firms, roles, permissions, users, helper functions, shared triggers.
-- Conventions (see CLAUDE.md):
--   * every business table has firm_id and is isolated by RLS
--   * soft delete only (deleted_at); authenticated users have no DELETE privilege
--   * updated_at is the optimistic-lock token; app.touch() maintains it
--   * every write is captured in activity_log by app.audit()

create extension if not exists pg_trgm with schema extensions;

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.client_type as enum ('individual', 'aop', 'company');

create type public.app_module as enum ('clients', 'returns', 'notices', 'fees', 'vault', 'settings');

create type public.return_status as enum (
  'not_started', 'documents_requested', 'documents_received', 'in_preparation',
  'under_review', 'sent_for_client_approval', 'approved', 'filed',
  'acknowledgment_uploaded', 'closed'
);

create type public.atl_status as enum ('unknown', 'active', 'inactive');

create type public.tax_law as enum ('ito_2001', 'sta_1990', 'provincial');

create type public.notice_status as enum (
  'received', 'reply_drafted', 'under_review', 'submitted', 'hearing', 'order', 'closed', 'appealed'
);

create type public.appeal_forum as enum ('commissioner_appeals', 'atir', 'high_court', 'supreme_court');

create type public.appeal_status as enum ('drafting', 'filed', 'hearing', 'decided', 'withdrawn');

create type public.appeal_outcome as enum ('pending', 'allowed', 'partly_allowed', 'dismissed', 'remanded', 'withdrawn');

create type public.task_status as enum ('open', 'in_progress', 'done', 'cancelled');

create type public.wealth_category as enum (
  'immovable_property', 'vehicle', 'bank_balance', 'cash', 'gold', 'securities',
  'receivables', 'business_capital', 'liabilities', 'other'
);

create type public.relation_type as enum (
  'spouse', 'parent', 'child', 'sibling', 'director', 'partner', 'member', 'shareholder'
);

create type public.registration_authority as enum ('PRA', 'SRB', 'KPRA', 'BRA', 'other');

create type public.portal as enum ('IRIS', 'PRA', 'SRB', 'KPRA', 'BRA', 'other');

create type public.deadline_kind as enum (
  'annual_return', 'sales_tax_return', 'withholding_statement', 'appeal_limitation'
);

create type public.pipeline_entity as enum ('return', 'notice');

-- ---------------------------------------------------------------------------
-- Firms
-- ---------------------------------------------------------------------------
create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  ntn text,
  phone text,
  email text,
  address text,
  city text,
  -- display defaults
  default_number_format text not null default 'lakh' check (default_number_format in ('lakh', 'international')),
  -- wealth reconciliation
  wealth_gap_threshold numeric(16, 2) not null default 100000 check (wealth_gap_threshold >= 0),
  -- ATL restoration surcharge (editable; verify against current law)
  atl_surcharge_individual numeric(16, 2) not null default 25000,
  atl_surcharge_aop numeric(16, 2) not null default 50000,
  atl_surcharge_company numeric(16, 2) not null default 100000,
  atl_risk_days integer not null default 14 check (atl_risk_days between 0 and 365),
  -- Section 114C (enacted, not yet notified): feature-flagged off
  s114c_enabled boolean not null default false,
  s114c_vehicle_threshold numeric(16, 2) not null default 7000000,
  s114c_property_threshold numeric(16, 2) not null default 100000000,
  s114c_ratio numeric(6, 4) not null default 1.30 check (s114c_ratio > 0),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

-- ---------------------------------------------------------------------------
-- Roles and the permission matrix (role x module -> view / edit)
-- ---------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  is_system boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  unique (firm_id, key)
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  role_id uuid not null references public.roles (id),
  module public.app_module not null,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  unique (role_id, module),
  check (not can_edit or can_view)
);

-- ---------------------------------------------------------------------------
-- Users (firm members). id = auth.users.id. One firm per user.
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id),
  firm_id uuid not null references public.firms (id),
  role_id uuid not null references public.roles (id),
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null,
  phone text,
  is_active boolean not null default true,
  number_format text check (number_format in ('lakh', 'international')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index users_firm_idx on public.users (firm_id);

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS. SECURITY DEFINER so they can read users/roles
-- without recursing through RLS. All are STABLE and wrapped in (select ...) in
-- policies so Postgres evaluates them once per statement.
-- ---------------------------------------------------------------------------

-- Membership without the 2FA check. Used by get_my_context() and by the 2FA gate itself.
create or replace function app.membership_firm_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select u.firm_id
  from public.users u
  join public.firms f on f.id = u.firm_id and f.deleted_at is null
  where u.id = auth.uid() and u.is_active and u.deleted_at is null
$$;

create or replace function app.role_key()
returns text
language sql stable security definer set search_path = ''
as $$
  select r.key
  from public.users u join public.roles r on r.id = u.role_id
  where u.id = auth.uid() and u.is_active and u.deleted_at is null
$$;

create or replace function app.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(app.role_key() = 'owner', false)
$$;

-- Raw permission lookup (no 2FA check). Owner always has everything.
create or replace function app.role_can(p_module public.app_module, p_action text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when app.is_owner() then true
    else coalesce((
      select case when p_action = 'edit' then rp.can_edit else rp.can_view end
      from public.users u
      join public.role_permissions rp on rp.role_id = u.role_id and rp.deleted_at is null
      where u.id = auth.uid() and u.is_active and u.deleted_at is null and rp.module = p_module
    ), false)
  end
$$;

-- TOTP 2FA is required for the owner and for anyone with vault access.
create or replace function app.requires_mfa()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.is_owner() or app.role_can('vault', 'view')
$$;

create or replace function app.mfa_ok()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not app.requires_mfa() or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

-- The firm the current request may see. NULL (so every policy fails) when the
-- user is not an active member, or must use 2FA and has not verified it this session.
create or replace function app.firm_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select case when app.mfa_ok() then app.membership_firm_id() end
$$;

create or replace function app.can(p_module public.app_module, p_action text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.firm_id() is not null and app.role_can(p_module, p_action)
$$;

grant execute on all functions in schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Shared row triggers
-- ---------------------------------------------------------------------------

-- Stamps created_*/updated_* and freezes firm_id/created_*. updated_at is the
-- optimistic-locking token, so it must change on every update.
create or replace function app.touch()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by, new.created_by);
  else
    new.id := old.id;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    if to_jsonb(new) ? 'firm_id' then
      if (to_jsonb(new) ->> 'firm_id') is distinct from (to_jsonb(old) ->> 'firm_id') then
        raise exception 'firm_id cannot be changed' using errcode = 'P0001';
      end if;
    end if;
    new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    -- Soft delete bookkeeping
    if new.deleted_at is not null and old.deleted_at is null then
      new.deleted_by := coalesce(auth.uid(), new.deleted_by);
    elsif new.deleted_at is null then
      new.deleted_by := null;
    end if;
  end if;
  return new;
end;
$$;

-- Users: only settings-editors may change role / active state / email; a user can edit their own name, phone and number format.
create or replace function app.guard_users()
returns trigger
language plpgsql
as $$
begin
  -- service role and SECURITY DEFINER functions (e.g. create_firm) run as a privileged role
  if auth.uid() is null or current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if not app.can('settings', 'edit') then
      raise exception 'Only users with Settings edit rights can add users' using errcode = '42501';
    end if;
    if not app.is_owner() and exists (select 1 from public.roles r where r.id = new.role_id and r.key = 'owner') then
      raise exception 'Only an Owner can grant the Owner role' using errcode = '42501';
    end if;
    return new;
  end if;
  if not app.can('settings', 'edit') then
    if old.id <> auth.uid() then
      raise exception 'You do not have permission to edit other users' using errcode = '42501';
    end if;
    if new.role_id is distinct from old.role_id or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Only users with Settings edit rights can change roles or access' using errcode = '42501';
    end if;
  end if;
  -- Only an Owner can grant or remove the Owner role.
  if new.role_id is distinct from old.role_id and not app.is_owner()
     and exists (select 1 from public.roles r where r.id in (old.role_id, new.role_id) and r.key = 'owner') then
    raise exception 'Only an Owner can grant or remove the Owner role' using errcode = '42501';
  end if;
  -- The firm must always keep at least one active owner.
  if (new.role_id is distinct from old.role_id or not new.is_active or new.deleted_at is not null)
     and exists (select 1 from public.roles r where r.id = old.role_id and r.key = 'owner')
     and not exists (
       select 1 from public.users u join public.roles r on r.id = u.role_id
       where u.firm_id = old.firm_id and r.key = 'owner' and u.is_active and u.deleted_at is null and u.id <> old.id
     ) then
    raise exception 'The firm must keep at least one active Owner' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Owner role's permissions are fixed (always full access).
create or replace function app.guard_role_permissions()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' and exists (select 1 from public.roles r where r.id = new.role_id and r.key = 'owner') then
    raise exception 'The Owner role always has full access and cannot be changed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
