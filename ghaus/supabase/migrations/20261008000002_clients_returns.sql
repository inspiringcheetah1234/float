-- Clients, relations, registrations, client tax years, wealth statement,
-- deadline rules and overrides, pipeline task rules, settings libraries.

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_type public.client_type not null,
  name text not null check (length(trim(name)) > 0),
  cnic text check (cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]$'),
  ntn text check (ntn ~ '^[0-9A-Za-z-]{1,20}$'),
  strn text check (strn ~ '^[0-9A-Za-z-]{1,20}$'),
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  referred_by text,
  assignee_id uuid references public.users (id),
  reviewer_id uuid references public.users (id),
  is_active boolean not null default true,
  notes text,
  -- digits-only copies for fast search ("3520212345671" finds "35202-1234567-1")
  search_digits text generated always as (
    regexp_replace(coalesce(cnic, '') || ' ' || coalesce(ntn, '') || ' ' || coalesce(strn, '') || ' '
      || coalesce(phone, '') || ' ' || coalesce(whatsapp, ''), '[^0-9 ]', '', 'g')
  ) stored,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index clients_firm_idx on public.clients (firm_id) where deleted_at is null;
create index clients_name_trgm on public.clients using gin (name extensions.gin_trgm_ops);
create index clients_digits_trgm on public.clients using gin (search_digits extensions.gin_trgm_ops);
create unique index clients_cnic_uniq on public.clients (firm_id, cnic) where deleted_at is null and cnic is not null;
create unique index clients_ntn_uniq on public.clients (firm_id, ntn) where deleted_at is null and ntn is not null;
create index clients_assignee_idx on public.clients (assignee_id);
create index clients_reviewer_idx on public.clients (reviewer_id);

-- Provincial sales-tax registrations (PRA, SRB, KPRA, BRA); multiple per client.
create table public.client_registrations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  authority public.registration_authority not null,
  registration_no text not null check (length(trim(registration_no)) > 0),
  registered_on date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index client_registrations_client_idx on public.client_registrations (client_id);

-- related_client "is the <relation> of" client. e.g. client = company, related = person, relation = director.
create table public.client_relations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  related_client_id uuid not null references public.clients (id),
  relation public.relation_type not null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  check (client_id <> related_client_id)
);
create unique index client_relations_uniq on public.client_relations (client_id, related_client_id, relation) where deleted_at is null;
create index client_relations_related_idx on public.client_relations (related_client_id);

-- ---------------------------------------------------------------------------
-- Client x Tax Year: the spine of the system.
-- Pakistani tax year N runs 1 July (N-1) to 30 June N.
-- ---------------------------------------------------------------------------
create table public.client_tax_years (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  tax_year smallint not null check (tax_year between 2000 and 2100),
  return_status public.return_status not null default 'not_started',
  assignee_id uuid references public.users (id),
  reviewer_id uuid references public.users (id),
  review_signed_off_by uuid references public.users (id),
  review_signed_off_at timestamptz,
  filed_on date,
  acknowledgment_no text,
  -- income by head
  income_salary numeric(16, 2) not null default 0,
  income_property numeric(16, 2) not null default 0,
  income_business numeric(16, 2) not null default 0,
  income_capital_gains numeric(16, 2) not null default 0,
  income_other_sources numeric(16, 2) not null default 0,
  income_exempt numeric(16, 2) not null default 0,
  income_final_fixed numeric(16, 2) not null default 0,
  taxable_income numeric(16, 2) not null default 0,
  tax_chargeable numeric(16, 2) not null default 0,
  tax_withheld_paid numeric(16, 2) not null default 0,
  -- positive = payable, negative = refundable
  payable_refundable numeric(16, 2) generated always as (tax_chargeable - tax_withheld_paid) stored,
  -- wealth reconciliation inputs
  opening_wealth numeric(16, 2) not null default 0,
  closing_wealth numeric(16, 2) not null default 0,
  personal_expenses numeric(16, 2) not null default 0,
  inflow_gifts numeric(16, 2) not null default 0,
  inflow_inheritance numeric(16, 2) not null default 0,
  inflow_loans numeric(16, 2) not null default 0,
  inflow_foreign_remittance numeric(16, 2) not null default 0,
  inflow_other numeric(16, 2) not null default 0,
  other_outflows numeric(16, 2) not null default 0,
  -- ATL (Active Taxpayers List)
  atl_status public.atl_status not null default 'unknown',
  atl_last_checked_on date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create unique index client_tax_years_uniq on public.client_tax_years (client_id, tax_year) where deleted_at is null;
create index client_tax_years_firm_year_idx on public.client_tax_years (firm_id, tax_year) where deleted_at is null;
create index client_tax_years_assignee_idx on public.client_tax_years (assignee_id);
create index client_tax_years_reviewer_idx on public.client_tax_years (reviewer_id);

-- Wealth statement lines. Liabilities are entered as positive amounts and subtracted.
create table public.wealth_items (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_tax_year_id uuid not null references public.client_tax_years (id),
  client_id uuid not null references public.clients (id),
  category public.wealth_category not null,
  description text not null check (length(trim(description)) > 0),
  cost numeric(16, 2) not null default 0 check (cost >= 0),
  is_cash_equivalent boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index wealth_items_cty_idx on public.wealth_items (client_tax_year_id) where deleted_at is null;
create index wealth_items_client_idx on public.wealth_items (client_id);

-- ---------------------------------------------------------------------------
-- Deadlines: rules + overrides. Never hard-coded in application code.
-- ---------------------------------------------------------------------------
create table public.deadline_rules (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  kind public.deadline_kind not null,
  -- annual_return: which client types it covers
  client_types public.client_type[],
  -- sales_tax_return: FBR / PRA / SRB / KPRA / BRA
  authority text,
  -- appeal_limitation: forum the appeal is filed in
  forum public.appeal_forum,
  -- annual_return: due on (due_month, due_day) in year (tax_year + year_offset)
  due_month smallint check (due_month between 1 and 12),
  due_day smallint check (due_day between 1 and 31),
  year_offset smallint default 0,
  -- periodic returns/statements: due on due_day of the month month_offset after the period
  month_offset smallint,
  period_months smallint check (period_months in (1, 3, 6, 12)),
  -- appeal_limitation: days counted from receipt of the order
  days_after integer check (days_after > 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  unique (firm_id, key)
);

create table public.deadline_overrides (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  rule_id uuid not null references public.deadline_rules (id),
  -- annual returns: the tax year affected
  tax_year smallint check (tax_year between 2000 and 2100),
  -- periodic returns: first day of the period affected
  period_start date,
  -- restrict to some client types; null = every type the rule covers
  client_types public.client_type[],
  due_date date not null,
  reference text not null check (length(trim(reference)) > 0),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  check (tax_year is not null or period_start is not null)
);
create index deadline_overrides_rule_idx on public.deadline_overrides (rule_id) where deleted_at is null;

-- Annual return due date for a client type and tax year: latest override wins, else the rule.
create or replace function public.return_due_date(p_firm_id uuid, p_client_type public.client_type, p_tax_year integer)
returns date
language sql stable security invoker set search_path = ''
as $$
  with rule as (
    select r.*
    from public.deadline_rules r
    where r.firm_id = p_firm_id and r.kind = 'annual_return' and r.is_active and r.deleted_at is null
      and (r.client_types is null or p_client_type = any (r.client_types))
    order by r.created_at
    limit 1
  )
  select coalesce(
    (
      select o.due_date
      from public.deadline_overrides o join rule on rule.id = o.rule_id
      where o.deleted_at is null and o.tax_year = p_tax_year
        and (o.client_types is null or p_client_type = any (o.client_types))
      order by o.created_at desc
      limit 1
    ),
    (
      select make_date(p_tax_year + coalesce(rule.year_offset, 0), rule.due_month, rule.due_day)
      from rule
      where rule.due_month is not null and rule.due_day is not null
    )
  )
$$;

-- Appeal limitation deadline for a forum, counted from receipt of the order.
create or replace function public.appeal_limitation_date(p_firm_id uuid, p_forum public.appeal_forum, p_order_received_on date)
returns date
language sql stable security invoker set search_path = ''
as $$
  select p_order_received_on + r.days_after
  from public.deadline_rules r
  where r.firm_id = p_firm_id and r.kind = 'appeal_limitation' and r.forum = p_forum
    and r.is_active and r.deleted_at is null and p_order_received_on is not null
  order by r.created_at
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Settings libraries
-- ---------------------------------------------------------------------------
create table public.notice_sections (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  law public.tax_law not null,
  section text not null check (length(trim(section)) > 0),
  title text not null,
  description text,
  default_reply_days integer not null default 15 check (default_reply_days between 0 and 365),
  reply_template text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create unique index notice_sections_uniq on public.notice_sections (firm_id, law, section) where deleted_at is null;

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  unique (firm_id, key)
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'email', 'sms')),
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  unique (firm_id, key)
);

-- Pipeline moves auto-create tasks. {client} and {ty} are substituted in the title.
create table public.pipeline_task_rules (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  entity public.pipeline_entity not null,
  on_status text not null,
  title text not null,
  assign_to text not null default 'assignee' check (assign_to in ('assignee', 'reviewer')),
  due_in_days integer not null default 3 check (due_in_days between 0 and 365),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index pipeline_task_rules_lookup on public.pipeline_task_rules (firm_id, entity, on_status) where deleted_at is null;
