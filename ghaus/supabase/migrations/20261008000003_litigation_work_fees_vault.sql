-- Notices, hearings, appeals, documents, tasks, comments, notifications,
-- fees, credentials vault, activity log.

alter table public.pipeline_task_rules add constraint pipeline_task_rules_status_chk check (
  (entity = 'return' and on_status in (
    'not_started', 'documents_requested', 'documents_received', 'in_preparation', 'under_review',
    'sent_for_client_approval', 'approved', 'filed', 'acknowledgment_uploaded', 'closed'))
  or (entity = 'notice' and on_status in (
    'received', 'reply_drafted', 'under_review', 'submitted', 'hearing', 'order', 'closed', 'appealed'))
);

-- ---------------------------------------------------------------------------
-- Notices
-- ---------------------------------------------------------------------------
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  client_tax_year_id uuid references public.client_tax_years (id),
  tax_year smallint check (tax_year between 2000 and 2100),
  law public.tax_law not null default 'ito_2001',
  section_id uuid references public.notice_sections (id),
  section text not null check (length(trim(section)) > 0),
  notice_no text,
  issue_date date,
  received_date date,
  reply_due_date date,
  officer_name text,
  officer_designation text,
  tax_office_type text check (tax_office_type in ('RTO', 'LTO', 'CTO', 'MTO', 'PRA', 'SRB', 'KPRA', 'BRA', 'other')),
  tax_office_city text,
  demand_amount numeric(16, 2) not null default 0 check (demand_amount >= 0),
  status public.notice_status not null default 'received',
  assignee_id uuid references public.users (id),
  reviewer_id uuid references public.users (id),
  review_signed_off_by uuid references public.users (id),
  review_signed_off_at timestamptz,
  submitted_on date,
  summary text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index notices_firm_status_idx on public.notices (firm_id, status) where deleted_at is null;
create index notices_client_idx on public.notices (client_id);
create index notices_due_idx on public.notices (reply_due_date) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Appeals (linked to the originating order / notice)
-- ---------------------------------------------------------------------------
create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  notice_id uuid references public.notices (id),
  parent_appeal_id uuid references public.appeals (id),
  tax_year smallint check (tax_year between 2000 and 2100),
  forum public.appeal_forum not null,
  order_no text,
  order_date date,
  order_received_on date,
  filed_on date,
  appeal_no text,
  demand_amount numeric(16, 2) not null default 0 check (demand_amount >= 0),
  status public.appeal_status not null default 'drafting',
  outcome public.appeal_outcome not null default 'pending',
  assignee_id uuid references public.users (id),
  reviewer_id uuid references public.users (id),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index appeals_firm_idx on public.appeals (firm_id, status) where deleted_at is null;
create index appeals_client_idx on public.appeals (client_id);

-- ---------------------------------------------------------------------------
-- Hearings (on a notice or an appeal)
-- ---------------------------------------------------------------------------
create table public.hearings (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  notice_id uuid references public.notices (id),
  appeal_id uuid references public.appeals (id),
  hearing_date date not null,
  hearing_time time,
  forum text,
  appearing_user_id uuid references public.users (id),
  status text not null default 'scheduled' check (status in ('scheduled', 'attended', 'adjourned', 'decided', 'cancelled')),
  outcome text,
  next_date date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  check (notice_id is not null or appeal_id is not null)
);
create index hearings_date_idx on public.hearings (firm_id, hearing_date) where deleted_at is null;
create index hearings_appearing_idx on public.hearings (appearing_user_id);

-- ---------------------------------------------------------------------------
-- Documents (files live in the private "documents" Storage bucket under
-- <firm_id>/<client_id>/...; served only via short-expiry signed URLs)
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  client_tax_year_id uuid references public.client_tax_years (id),
  notice_id uuid references public.notices (id),
  appeal_id uuid references public.appeals (id),
  document_type_id uuid references public.document_types (id),
  title text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  document_date date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index documents_client_idx on public.documents (client_id) where deleted_at is null;
create index documents_cty_idx on public.documents (client_tax_year_id) where deleted_at is null;
create index documents_notice_idx on public.documents (notice_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  title text not null check (length(trim(title)) > 0),
  description text,
  client_id uuid references public.clients (id),
  client_tax_year_id uuid references public.client_tax_years (id),
  notice_id uuid references public.notices (id),
  appeal_id uuid references public.appeals (id),
  assignee_id uuid references public.users (id),
  due_date date,
  status public.task_status not null default 'open',
  completed_at timestamptz,
  auto_rule_id uuid references public.pipeline_task_rules (id),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index tasks_assignee_idx on public.tasks (assignee_id, status) where deleted_at is null;
create index tasks_cty_idx on public.tasks (client_tax_year_id);
create index tasks_client_idx on public.tasks (client_id);
create index tasks_notice_idx on public.tasks (notice_id);

-- ---------------------------------------------------------------------------
-- Comments (internal) with @mentions
-- ---------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  entity_type text not null check (entity_type in ('client', 'client_tax_year', 'notice', 'appeal')),
  entity_id uuid not null,
  client_id uuid not null references public.clients (id),
  body text not null check (length(trim(body)) > 0),
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index comments_entity_idx on public.comments (entity_type, entity_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Notifications (in-app, per user)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  user_id uuid not null references public.users (id),
  kind text not null,
  title text not null,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Fees (PKR only): agreements, invoices, payments
-- ---------------------------------------------------------------------------
create table public.fee_agreements (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  client_tax_year_id uuid references public.client_tax_years (id),
  notice_id uuid references public.notices (id),
  appeal_id uuid references public.appeals (id),
  description text not null,
  amount numeric(16, 2) not null check (amount >= 0),
  agreed_on date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index fee_agreements_client_idx on public.fee_agreements (client_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  fee_agreement_id uuid references public.fee_agreements (id),
  invoice_no text not null,
  issue_date date not null,
  due_date date,
  amount numeric(16, 2) not null check (amount >= 0),
  status text not null default 'issued' check (status in ('draft', 'issued', 'void')),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create unique index invoices_no_uniq on public.invoices (firm_id, invoice_no) where deleted_at is null;
create index invoices_client_idx on public.invoices (client_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  invoice_id uuid references public.invoices (id),
  amount numeric(16, 2) not null check (amount > 0),
  received_on date not null,
  method text not null default 'bank' check (method in ('cash', 'bank', 'cheque', 'online', 'other')),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index payments_client_idx on public.payments (client_id);
create index payments_invoice_idx on public.payments (invoice_id);

-- ---------------------------------------------------------------------------
-- Credentials vault. secret_ciphertext is AES-256-GCM, encrypted in the app
-- with CREDENTIALS_ENCRYPTION_KEY. The authenticated role cannot even SELECT
-- the ciphertext column; Reveal goes through a server action that checks
-- vault permission + aal2, decrypts, and writes activity_log.
-- ---------------------------------------------------------------------------
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id),
  client_id uuid not null references public.clients (id),
  portal public.portal not null,
  label text,
  username text not null,
  secret_ciphertext text not null,
  notes text,
  last_rotated_on date,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);
create index credentials_client_idx on public.credentials (client_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Activity log: every create / update / delete, with before/after.
-- Written only by triggers and SECURITY DEFINER functions.
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  firm_id uuid not null references public.firms (id),
  module public.app_module,
  table_name text not null,
  record_id uuid not null,
  client_id uuid,
  action text not null check (action in ('insert', 'update', 'delete', 'restore', 'reveal', 'sign_off', 'export')),
  actor_id uuid,
  at timestamptz not null default now(),
  changed_fields text[],
  before jsonb,
  after jsonb
);
create index activity_log_record_idx on public.activity_log (table_name, record_id, at desc);
create index activity_log_client_idx on public.activity_log (client_id, at desc);
create index activity_log_firm_idx on public.activity_log (firm_id, at desc);
