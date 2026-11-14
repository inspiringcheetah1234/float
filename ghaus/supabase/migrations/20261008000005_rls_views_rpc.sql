-- Privileges, Row Level Security, views, RPCs, firm bootstrap and seed defaults.

-- ---------------------------------------------------------------------------
-- Privileges: no anonymous access; nothing is hard-deleted by app users.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

revoke delete, truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update on public.activity_log from authenticated;

-- Credentials: the ciphertext column is not selectable by app users at all.
revoke select on public.credentials from authenticated;
grant select (id, firm_id, client_id, portal, label, username, notes, last_rotated_on,
  created_at, created_by, updated_at, updated_by, deleted_at, deleted_by) on public.credentials to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  -- Standard module-scoped tables
  for t in
    select * from (values
      ('clients', 'clients'),
      ('client_registrations', 'clients'),
      ('client_relations', 'clients'),
      ('documents', 'clients'),
      ('client_tax_years', 'returns'),
      ('wealth_items', 'returns'),
      ('notices', 'notices'),
      ('appeals', 'notices'),
      ('hearings', 'notices'),
      ('fee_agreements', 'fees'),
      ('invoices', 'fees'),
      ('payments', 'fees'),
      ('credentials', 'vault')
    ) as v(tbl, module)
  loop
    execute format('alter table public.%I enable row level security', t.tbl);
    execute format($p$create policy firm_select on public.%I for select to authenticated
      using (firm_id = (select app.firm_id()) and (select app.can(%L, 'view')))$p$, t.tbl, t.module);
    execute format($p$create policy firm_insert on public.%I for insert to authenticated
      with check (firm_id = (select app.firm_id()) and (select app.can(%L, 'edit')))$p$, t.tbl, t.module);
    execute format($p$create policy firm_update on public.%I for update to authenticated
      using (firm_id = (select app.firm_id()) and (select app.can(%L, 'edit')))
      with check (firm_id = (select app.firm_id()))$p$, t.tbl, t.module);
  end loop;

  -- Settings libraries: every member reads, Settings editors write.
  for t in
    select * from (values
      ('roles'), ('role_permissions'), ('deadline_rules'), ('deadline_overrides'),
      ('notice_sections'), ('document_types'), ('message_templates'), ('pipeline_task_rules')
    ) as v(tbl)
  loop
    execute format('alter table public.%I enable row level security', t.tbl);
    execute format($p$create policy firm_select on public.%I for select to authenticated
      using (firm_id = (select app.firm_id()))$p$, t.tbl);
    execute format($p$create policy firm_insert on public.%I for insert to authenticated
      with check (firm_id = (select app.firm_id()) and (select app.can('settings', 'edit')))$p$, t.tbl);
    execute format($p$create policy firm_update on public.%I for update to authenticated
      using (firm_id = (select app.firm_id()) and (select app.can('settings', 'edit')))
      with check (firm_id = (select app.firm_id()))$p$, t.tbl);
  end loop;
end;
$$;

alter table public.firms enable row level security;
create policy firm_select on public.firms for select to authenticated
  using (id = (select app.firm_id()));
create policy firm_update on public.firms for update to authenticated
  using (id = (select app.firm_id()) and (select app.can('settings', 'edit')))
  with check (id = (select app.firm_id()));

alter table public.users enable row level security;
create policy firm_select on public.users for select to authenticated
  using (firm_id = (select app.firm_id()));
create policy firm_insert on public.users for insert to authenticated
  with check (firm_id = (select app.firm_id()) and (select app.can('settings', 'edit')));
-- Self-edits are narrowed further by app.guard_users().
create policy firm_update on public.users for update to authenticated
  using (firm_id = (select app.firm_id()) and ((select app.can('settings', 'edit')) or id = (select auth.uid())))
  with check (firm_id = (select app.firm_id()));

alter table public.tasks enable row level security;
create policy firm_select on public.tasks for select to authenticated
  using (firm_id = (select app.firm_id()));
create policy firm_insert on public.tasks for insert to authenticated
  with check (firm_id = (select app.firm_id()));
create policy firm_update on public.tasks for update to authenticated
  using (firm_id = (select app.firm_id()))
  with check (firm_id = (select app.firm_id()));

alter table public.comments enable row level security;
create policy firm_select on public.comments for select to authenticated
  using (firm_id = (select app.firm_id()) and (select app.can('clients', 'view')));
create policy firm_insert on public.comments for insert to authenticated
  with check (firm_id = (select app.firm_id()) and (select app.can('clients', 'view')) and created_by = (select auth.uid()));
create policy firm_update on public.comments for update to authenticated
  using (firm_id = (select app.firm_id()) and created_by = (select auth.uid()))
  with check (firm_id = (select app.firm_id()));

alter table public.notifications enable row level security;
create policy own_select on public.notifications for select to authenticated
  using (firm_id = (select app.firm_id()) and user_id = (select auth.uid()));
create policy own_update on public.notifications for update to authenticated
  using (firm_id = (select app.firm_id()) and user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.activity_log enable row level security;
create policy firm_select on public.activity_log for select to authenticated
  using (firm_id = (select app.firm_id()) and (module is null or app.can(module, 'view')));

-- comments.created_by is set by app.touch() before RLS WITH CHECK runs, so
-- the "created_by = auth.uid()" check above holds for every honest insert.

-- ---------------------------------------------------------------------------
-- Views (security_invoker: the caller's RLS applies)
-- ---------------------------------------------------------------------------
create or replace view public.v_client_tax_years
with (security_invoker = true)
as
select
  cty.*,
  c.name as client_name,
  c.client_type,
  c.cnic,
  c.ntn,
  c.city,
  c.is_active as client_is_active,
  public.return_due_date(cty.firm_id, c.client_type, cty.tax_year) as filing_due_date,
  coalesce(w.item_count, 0) as wealth_item_count,
  coalesce(w.assets, 0) as wealth_assets,
  coalesce(w.liabilities, 0) as wealth_liabilities,
  coalesce(w.cash_equivalents, 0) as wealth_cash_equivalents,
  case when coalesce(w.item_count, 0) > 0 then w.assets - w.liabilities else cty.closing_wealth end as effective_closing_wealth,
  (cty.income_salary + cty.income_property + cty.income_business + cty.income_capital_gains + cty.income_other_sources)
    as total_declared_income,
  (cty.inflow_gifts + cty.inflow_inheritance + cty.inflow_loans + cty.inflow_foreign_remittance + cty.inflow_other)
    as total_other_inflows,
  (cty.opening_wealth
    + cty.income_salary + cty.income_property + cty.income_business + cty.income_capital_gains + cty.income_other_sources
    + cty.income_exempt + cty.income_final_fixed
    + cty.inflow_gifts + cty.inflow_inheritance + cty.inflow_loans + cty.inflow_foreign_remittance + cty.inflow_other
    - cty.personal_expenses - cty.other_outflows) as expected_closing_wealth,
  (case when coalesce(w.item_count, 0) > 0 then w.assets - w.liabilities else cty.closing_wealth end)
  - (cty.opening_wealth
    + cty.income_salary + cty.income_property + cty.income_business + cty.income_capital_gains + cty.income_other_sources
    + cty.income_exempt + cty.income_final_fixed
    + cty.inflow_gifts + cty.inflow_inheritance + cty.inflow_loans + cty.inflow_foreign_remittance + cty.inflow_other
    - cty.personal_expenses - cty.other_outflows) as wealth_gap,
  app.return_rank(cty.return_status) >= app.return_rank('filed') as is_filed
from public.client_tax_years cty
join public.clients c on c.id = cty.client_id and c.deleted_at is null
left join lateral (
  select
    count(*) as item_count,
    sum(wi.cost) filter (where wi.category <> 'liabilities') as assets,
    coalesce(sum(wi.cost) filter (where wi.category = 'liabilities'), 0) as liabilities,
    coalesce(sum(wi.cost) filter (where wi.is_cash_equivalent and wi.category <> 'liabilities'), 0) as cash_equivalents
  from public.wealth_items wi
  where wi.client_tax_year_id = cty.id and wi.deleted_at is null
) w on true
where cty.deleted_at is null;

create or replace view public.v_appeals
with (security_invoker = true)
as
select
  a.*,
  c.name as client_name,
  public.appeal_limitation_date(a.firm_id, a.forum, a.order_received_on) as limitation_deadline
from public.appeals a
join public.clients c on c.id = a.client_id
where a.deleted_at is null;

create or replace view public.v_invoice_balances
with (security_invoker = true)
as
select
  i.*,
  c.name as client_name,
  coalesce(p.paid, 0) as paid,
  i.amount - coalesce(p.paid, 0) as balance
from public.invoices i
join public.clients c on c.id = i.client_id
left join lateral (
  select sum(amount) as paid from public.payments p
  where p.invoice_id = i.id and p.deleted_at is null
) p on true
where i.deleted_at is null and i.status = 'issued';

grant select on public.v_client_tax_years, public.v_appeals, public.v_invoice_balances to authenticated;
revoke all on public.v_client_tax_years, public.v_appeals, public.v_invoice_balances from anon;

-- ---------------------------------------------------------------------------
-- Seed defaults for a new firm. Deadlines and notice windows are starting
-- points only: the Settings screens say "Verify against current law".
-- ---------------------------------------------------------------------------
create or replace function app.seed_firm_defaults(p_firm_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_senior uuid;
  v_associate uuid;
  v_clerk uuid;
begin
  insert into public.roles (firm_id, key, name, is_system, sort_order) values
    (p_firm_id, 'owner', 'Owner', true, 10);
  insert into public.roles (firm_id, key, name, is_system, sort_order)
    values (p_firm_id, 'senior_associate', 'Senior Associate', true, 20) returning id into v_senior;
  insert into public.roles (firm_id, key, name, is_system, sort_order)
    values (p_firm_id, 'associate', 'Associate', true, 30) returning id into v_associate;
  insert into public.roles (firm_id, key, name, is_system, sort_order)
    values (p_firm_id, 'clerk', 'Clerk', true, 40) returning id into v_clerk;

  -- Owner has every permission implicitly (no rows needed).
  insert into public.role_permissions (firm_id, role_id, module, can_view, can_edit) values
    (p_firm_id, v_senior, 'clients', true, true),
    (p_firm_id, v_senior, 'returns', true, true),
    (p_firm_id, v_senior, 'notices', true, true),
    (p_firm_id, v_senior, 'fees', true, false),
    (p_firm_id, v_senior, 'vault', false, false),
    (p_firm_id, v_senior, 'settings', true, false),
    (p_firm_id, v_associate, 'clients', true, true),
    (p_firm_id, v_associate, 'returns', true, true),
    (p_firm_id, v_associate, 'notices', true, true),
    (p_firm_id, v_associate, 'fees', false, false),
    (p_firm_id, v_associate, 'vault', false, false),
    (p_firm_id, v_associate, 'settings', false, false),
    (p_firm_id, v_clerk, 'clients', true, true),
    (p_firm_id, v_clerk, 'returns', true, true),
    (p_firm_id, v_clerk, 'notices', true, false),
    (p_firm_id, v_clerk, 'fees', false, false),
    (p_firm_id, v_clerk, 'vault', false, false),
    (p_firm_id, v_clerk, 'settings', false, false);

  insert into public.deadline_rules (firm_id, key, name, kind, client_types, authority, forum, due_month, due_day, year_offset, month_offset, period_months, days_after, notes) values
    (p_firm_id, 'annual_return_individual_aop', 'Annual income tax return: individuals and AOPs', 'annual_return',
      array['individual', 'aop']::public.client_type[], 'FBR', null, 9, 30, 0, null, null, null,
      '30 September following the end of the tax year (s.118 ITO 2001).'),
    (p_firm_id, 'annual_return_company', 'Annual income tax return: companies (30 June year-end)', 'annual_return',
      array['company']::public.client_type[], 'FBR', null, 12, 31, 0, null, null, null,
      '31 December for a 30 June year-end. Companies with a special tax year need an override.'),
    (p_firm_id, 'sales_tax_federal', 'Monthly sales tax return (FBR)', 'sales_tax_return',
      null, 'FBR', null, null, 18, null, 1, 1, null, '18th of the following month.'),
    (p_firm_id, 'sales_tax_pra', 'Monthly sales tax on services return (PRA, Punjab)', 'sales_tax_return',
      null, 'PRA', null, null, 18, null, 1, 1, null, '18th of the following month.'),
    (p_firm_id, 'sales_tax_srb', 'Monthly sales tax on services return (SRB, Sindh)', 'sales_tax_return',
      null, 'SRB', null, null, 18, null, 1, 1, null, '18th of the following month.'),
    (p_firm_id, 'sales_tax_kpra', 'Monthly sales tax on services return (KPRA, Khyber Pakhtunkhwa)', 'sales_tax_return',
      null, 'KPRA', null, null, 18, null, 1, 1, null, '18th of the following month.'),
    (p_firm_id, 'sales_tax_bra', 'Monthly sales tax on services return (BRA, Balochistan)', 'sales_tax_return',
      null, 'BRA', null, null, 18, null, 1, 1, null, '18th of the following month.'),
    (p_firm_id, 'withholding_statement', 'Withholding statement (s.165)', 'withholding_statement',
      null, 'FBR', null, null, 20, null, 1, 3, null, 'Quarterly: 20th of the month after the quarter ends.'),
    (p_firm_id, 'appeal_commissioner', 'Appeal to Commissioner (Appeals)', 'appeal_limitation',
      null, null, 'commissioner_appeals', null, null, null, null, null, 30, '30 days from receipt of the order.'),
    (p_firm_id, 'appeal_atir', 'Appeal to Appellate Tribunal Inland Revenue (ATIR)', 'appeal_limitation',
      null, null, 'atir', null, null, null, null, null, 60, '60 days from receipt of the order.'),
    (p_firm_id, 'appeal_high_court', 'Reference to High Court', 'appeal_limitation',
      null, null, 'high_court', null, null, null, null, null, 90, '90 days from receipt of the order.');

  insert into public.notice_sections (firm_id, law, section, title, description, default_reply_days) values
    (p_firm_id, 'ito_2001', '114(4)', 'Notice to file a return',
      'The Commissioner requires the person to file an income tax return for the tax year(s) named in the notice, usually because no return was filed.', 30),
    (p_firm_id, 'ito_2001', '116', 'Notice to file a wealth statement',
      'The Commissioner requires a wealth statement (and reconciliation of wealth) for the tax year(s) named.', 30),
    (p_firm_id, 'ito_2001', '122(5A)', 'Amendment: assessment erroneous and prejudicial to revenue',
      'Show-cause before the Commissioner amends a deemed assessment considered erroneous in so far as it is prejudicial to the interest of revenue.', 15),
    (p_firm_id, 'ito_2001', '122(9)', 'Show-cause before amending an assessment',
      'Opportunity of being heard before an assessment is amended under section 122; sets out the proposed additions.', 15),
    (p_firm_id, 'ito_2001', '137', 'Notice of demand',
      'Demand for tax due under an assessment or order; payable within the period stated (usually 30 days).', 30),
    (p_firm_id, 'ito_2001', '138', 'Recovery of tax',
      'Recovery proceedings for unpaid tax, e.g. attachment of bank accounts or property.', 7),
    (p_firm_id, 'ito_2001', '161/205', 'Default in withholding and default surcharge',
      'Show-cause for failure to deduct or deposit withholding tax (s.161) and the related default surcharge (s.205).', 15),
    (p_firm_id, 'ito_2001', '176', 'Notice to obtain information or evidence',
      'The Commissioner requires information, documents or evidence (e.g. bank statements, property details) or attendance.', 15),
    (p_firm_id, 'ito_2001', '177', 'Audit',
      'The person has been selected for audit of their income tax affairs; records and explanations are requested.', 15),
    (p_firm_id, 'ito_2001', '182', 'Penalty proceedings',
      'Show-cause for a penalty for an offence listed in the section 182 table (e.g. late filing).', 15),
    (p_firm_id, 'sta_1990', '11', 'Assessment of sales tax',
      'Show-cause for sales tax not levied, short-levied or input tax wrongly claimed, before an assessment order.', 15),
    (p_firm_id, 'sta_1990', '25', 'Access to records / audit',
      'Officer requires access to records and documents, or the person is selected for sales tax audit.', 15);

  insert into public.document_types (firm_id, key, name, sort_order) values
    (p_firm_id, 'salary_certificate', 'Salary certificate', 10),
    (p_firm_id, 'withholding_certificate', 'Withholding certificate', 20),
    (p_firm_id, 'bank_statement', 'Bank statement', 30),
    (p_firm_id, 'property_documents', 'Property documents', 40),
    (p_firm_id, 'cpr', 'CPR (payment receipt)', 50),
    (p_firm_id, 'filed_return', 'Filed return', 60),
    (p_firm_id, 'acknowledgment', 'Acknowledgment', 70),
    (p_firm_id, 'notice', 'Notice', 80),
    (p_firm_id, 'order', 'Order', 90),
    (p_firm_id, 'reply', 'Reply', 100),
    (p_firm_id, 'other', 'Other', 999);

  insert into public.pipeline_task_rules (firm_id, entity, on_status, complete_on_status, title, assign_to, due_in_days) values
    (p_firm_id, 'return', 'documents_requested', 'documents_received', 'Follow up documents: {client} {ty}', 'assignee', 7),
    (p_firm_id, 'return', 'documents_received', 'under_review', 'Prepare return: {client} {ty}', 'assignee', 7),
    (p_firm_id, 'return', 'under_review', 'sent_for_client_approval', 'Review return: {client} {ty}', 'reviewer', 3),
    (p_firm_id, 'return', 'sent_for_client_approval', 'approved', 'Get client approval: {client} {ty}', 'assignee', 5),
    (p_firm_id, 'return', 'approved', 'filed', 'File return on IRIS: {client} {ty}', 'assignee', 2),
    (p_firm_id, 'return', 'filed', 'acknowledgment_uploaded', 'Upload acknowledgment: {client} {ty}', 'assignee', 2),
    (p_firm_id, 'notice', 'received', 'reply_drafted', 'Draft reply: {client}', 'assignee', 5),
    (p_firm_id, 'notice', 'under_review', 'submitted', 'Review notice reply: {client}', 'reviewer', 2),
    (p_firm_id, 'notice', 'hearing', 'order', 'Prepare for hearing: {client}', 'assignee', 3);

  insert into public.message_templates (firm_id, key, name, channel, body) values
    (p_firm_id, 'documents_request', 'Request documents for return', 'whatsapp',
      'Assalam-o-Alaikum {client}. To prepare your {ty} income tax return, please send: salary certificate, withholding certificates, bank statements (1 July to 30 June) and details of any property or vehicle bought or sold. Thank you, {firm}.'),
    (p_firm_id, 'return_for_approval', 'Return ready for approval', 'whatsapp',
      'Dear {client}, your {ty} return is ready for your review. Tax payable: {payable}. Please confirm so we can file it. {firm}.'),
    (p_firm_id, 'return_filed', 'Return filed', 'whatsapp',
      'Dear {client}, your {ty} income tax return has been filed. Acknowledgment no. {ack}. {firm}.');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Creates a firm and makes the caller its Owner (multi-tenant sign-up).
create or replace function public.create_firm(p_firm_name text, p_full_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_firm uuid;
  v_owner_role uuid;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if exists (select 1 from public.users where id = v_uid) then
    raise exception 'You already belong to a firm' using errcode = 'P0001';
  end if;
  if coalesce(length(trim(p_firm_name)), 0) = 0 or coalesce(length(trim(p_full_name)), 0) = 0 then
    raise exception 'Firm name and your name are required' using errcode = '22023';
  end if;
  select email into v_email from auth.users where id = v_uid;

  insert into public.firms (name, created_by, updated_by) values (trim(p_firm_name), v_uid, v_uid) returning id into v_firm;
  perform app.seed_firm_defaults(v_firm);
  select id into v_owner_role from public.roles where firm_id = v_firm and key = 'owner';
  insert into public.users (id, firm_id, role_id, full_name, email)
  values (v_uid, v_firm, v_owner_role, trim(p_full_name), coalesce(v_email, ''));
  return v_firm;
end;
$$;

-- Who am I, what can I do, and do I need 2FA? Not gated by 2FA so the app
-- can route the user to enrol / verify.
create or replace function public.get_my_context()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', u.id,
    'full_name', u.full_name,
    'email', u.email,
    'firm_id', u.firm_id,
    'firm_name', f.name,
    'role_id', r.id,
    'role_key', r.key,
    'role_name', r.name,
    'number_format', coalesce(u.number_format, f.default_number_format),
    'requires_mfa', app.requires_mfa(),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'),
    'permissions', (
      select jsonb_object_agg(m.module, jsonb_build_object(
        'view', app.role_can(m.module, 'view'),
        'edit', app.role_can(m.module, 'edit')))
      from unnest(enum_range(null::public.app_module)) as m(module)
    )
  )
  from public.users u
  join public.firms f on f.id = u.firm_id and f.deleted_at is null
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid() and u.is_active and u.deleted_at is null
$$;

grant execute on function public.create_firm(text, text) to authenticated;
grant execute on function public.get_my_context() to authenticated;
grant execute on function public.log_event(text, uuid, text, jsonb) to authenticated;
grant execute on function public.return_due_date(uuid, public.client_type, integer) to authenticated;
grant execute on function public.appeal_limitation_date(uuid, public.appeal_forum, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private documents bucket, paths start with the firm id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

create policy documents_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select app.firm_id())::text
         and (select app.can('clients', 'view')));
create policy documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select app.firm_id())::text
              and (select app.can('clients', 'edit')));
