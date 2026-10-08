-- Core database behaviour: tenancy, permissions, 2FA gate, review gate,
-- auto-tasks, deadlines, audit log, optimistic locking.
-- Run with: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;
select plan(53);

-- ---------------------------------------------------------------------------
-- Helpers: act as a user with a given assurance level
-- ---------------------------------------------------------------------------
create or replace function pg_temp.act_as(p_uid uuid, p_aal text default 'aal2')
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
end $$;

create or replace function pg_temp.act_as_admin()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'assoc-a@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'senior-a@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'clerk-a@example.com', 'authenticated', 'authenticated');

-- Firm A and Firm B through the public sign-up RPC
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a', 'aal1');
select isnt(public.create_firm('Ghaus & Company', 'Owner A'), null, 'owner A creates firm A');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b', 'aal1');
select isnt(public.create_firm('Other Firm', 'Owner B'), null, 'owner B creates firm B');
select throws_ok($$ select public.create_firm('Second', 'Owner B') $$, 'P0001', 'You already belong to a firm', 'one firm per user');

-- Firm A staff (added by an admin/server, as the Users screen does with the service role)
select pg_temp.act_as_admin();
create temp table firm_ids as select id, name from public.firms;
grant select on firm_ids to authenticated;
insert into public.users (id, firm_id, role_id, full_name, email)
select '00000000-0000-0000-0000-0000000000a1', f.id, r.id, 'Associate A', 'assoc-a@example.com'
from public.firms f join public.roles r on r.firm_id = f.id and r.key = 'associate' where f.name = 'Ghaus & Company';
insert into public.users (id, firm_id, role_id, full_name, email)
select '00000000-0000-0000-0000-0000000000a2', f.id, r.id, 'Senior A', 'senior-a@example.com'
from public.firms f join public.roles r on r.firm_id = f.id and r.key = 'senior_associate' where f.name = 'Ghaus & Company';
insert into public.users (id, firm_id, role_id, full_name, email)
select '00000000-0000-0000-0000-0000000000a3', f.id, r.id, 'Clerk A', 'clerk-a@example.com'
from public.firms f join public.roles r on r.firm_id = f.id and r.key = 'clerk' where f.name = 'Ghaus & Company';

select is((select count(*)::int from public.deadline_rules dr join public.firms f on f.id = dr.firm_id where f.name = 'Ghaus & Company'),
  11, 'deadline rules seeded for a new firm');
select is((select count(*)::int from public.notice_sections ns join public.firms f on f.id = ns.firm_id where f.name = 'Ghaus & Company'),
  12, 'notice section library seeded');

-- ---------------------------------------------------------------------------
-- 2FA: the owner sees nothing until the session is aal2
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a', 'aal1');
select is((select count(*)::int from public.firms), 0, 'owner without 2FA (aal1) sees no data');
select is((public.get_my_context() ->> 'requires_mfa')::boolean, true, 'context says owner requires 2FA');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a', 'aal2');
select is((select count(*)::int from public.firms), 1, 'owner with aal2 sees exactly their firm');

-- Associates do not need 2FA
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select is((public.get_my_context() ->> 'requires_mfa')::boolean, false, 'associate does not require 2FA');
select is((select count(*)::int from public.firms), 1, 'associate (aal1) sees their firm');

-- ---------------------------------------------------------------------------
-- Clients and tenancy
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.clients (id, client_type, name, cnic, assignee_id, reviewer_id) values
  ('10000000-0000-0000-0000-000000000001', 'individual', 'Ahmed Raza', '35202-1234567-1',
   '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-000000000002', 'company', 'Raza Textiles (Pvt) Ltd', null,
   '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.clients), 2, 'owner A sees own clients');
select throws_ok($$ insert into public.clients (client_type, name, cnic) values ('individual', 'Bad CNIC', '3520212345671') $$,
  '23514', null, 'CNIC must be formatted 12345-1234567-1');
select throws_ok($$ insert into public.clients (client_type, name, cnic) values ('individual', 'Dup', '35202-1234567-1') $$,
  '23505', null, 'CNIC unique within the firm');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.clients), 0, 'owner B cannot see firm A clients');
select is((select count(*)::int from public.users), 1, 'owner B sees only their own firm users');
select throws_ok(
  $$ insert into public.clients (firm_id, client_type, name) select id, 'individual', 'Smuggled' from firm_ids where name = 'Ghaus & Company' $$,
  '42501', null, 'cannot insert into another firm');
insert into public.clients (id, client_type, name) values ('20000000-0000-0000-0000-000000000001', 'individual', 'B Client');
select throws_ok(
  $$ insert into public.client_relations (client_id, related_client_id, relation)
     values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'spouse') $$,
  '23503', 'client_relations.related_client_id does not belong to this firm', 'cannot link to another firm''s client');
select is_empty($$ update public.clients set name = 'hijack' where id = '10000000-0000-0000-0000-000000000001' returning id $$,
  'owner B cannot update firm A client');

-- Same CNIC is fine in a different firm
insert into public.clients (client_type, name, cnic) values ('individual', 'Same person elsewhere', '35202-1234567-1');
select pass('same CNIC allowed in a different firm');

-- No hard deletes
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ delete from public.clients where id = '10000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'hard delete is not permitted');

-- ---------------------------------------------------------------------------
-- Permissions matrix
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a3', 'aal1');
select is((select count(*)::int from public.clients), 2, 'clerk can view clients');
select is((public.get_my_context() -> 'permissions' -> 'fees' ->> 'view')::boolean, false, 'clerk has no fee access by default');
select is((public.get_my_context() -> 'permissions' -> 'vault' ->> 'view')::boolean, false, 'clerk has no vault access by default');
select is_empty($$ update public.firms set name = 'x' returning id $$, 'clerk cannot edit firm settings');
select is_empty($$ update public.deadline_rules set due_day = 1 returning id $$, 'clerk cannot edit deadline rules');

-- Associate cannot make themselves owner
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select throws_ok(
  $$ update public.users set role_id = (select id from public.roles where key = 'owner') where id = auth.uid() $$,
  '42501', null, 'associate cannot change their own role');

-- ---------------------------------------------------------------------------
-- Deadlines
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is(public.return_due_date(app.firm_id(), 'individual', 2026), '2026-09-30'::date, 'TY2026 individual due 30-09-2026');
select is(public.return_due_date(app.firm_id(), 'company', 2026), '2026-12-31'::date, 'TY2026 company due 31-12-2026');
insert into public.deadline_overrides (rule_id, tax_year, client_types, due_date, reference)
select id, 2026, null, '2026-10-15', 'Circular 3 of 2026-27' from public.deadline_rules where key = 'annual_return_individual_aop';
select is(public.return_due_date(app.firm_id(), 'aop', 2026), '2026-10-15'::date, 'one override moves every affected client');
select is(public.return_due_date(app.firm_id(), 'company', 2026), '2026-12-31'::date, 'override does not touch companies');

-- ---------------------------------------------------------------------------
-- Return pipeline, review gate, auto-tasks
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1'); -- associate
insert into public.client_tax_years (id, client_id, tax_year, assignee_id, reviewer_id, opening_wealth, income_salary, personal_expenses)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2026,
        '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 1000000, 2400000, 1200000);
select is((select filing_due_date from public.v_client_tax_years where id = '30000000-0000-0000-0000-000000000001'),
  '2026-10-15'::date, 'client-year due date comes from rules + override');

update public.client_tax_years set return_status = 'documents_received' where id = '30000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.tasks where client_tax_year_id = '30000000-0000-0000-0000-000000000001'
            and title like 'Prepare return: Ahmed Raza TY2026' and assignee_id = '00000000-0000-0000-0000-0000000000a1'),
  1, '"Documents received" auto-creates "Prepare return" for the assignee');

update public.client_tax_years set return_status = 'in_preparation' where id = '30000000-0000-0000-0000-000000000001';
select is((select status::text from public.tasks where client_tax_year_id = '30000000-0000-0000-0000-000000000001'
            and title like 'Prepare return%'), 'open', '"Prepare return" stays open while in preparation');
update public.client_tax_years set return_status = 'under_review' where id = '30000000-0000-0000-0000-000000000001';
select is((select status::text from public.tasks where client_tax_year_id = '30000000-0000-0000-0000-000000000001'
            and title like 'Prepare return%'), 'done', 'reaching Under review completes "Prepare return"');
select is((select count(*)::int from public.notifications), 0, 'associate cannot read the reviewer''s notifications');

select throws_ok(
  $$ update public.client_tax_years set return_status = 'sent_for_client_approval' where id = '30000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Review sign-off required: a return cannot move past Under review until the reviewer signs off',
  'gate: cannot leave Under review without sign-off');
select throws_ok(
  $$ update public.client_tax_years set review_signed_off_at = now() where id = '30000000-0000-0000-0000-000000000001' $$,
  '42501', 'Only the assigned reviewer or an Owner can sign off this return', 'assignee cannot sign off their own work');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2', 'aal1'); -- senior = reviewer
select is((select count(*)::int from public.notifications where kind = 'review_requested'), 1, 'reviewer was notified');
update public.client_tax_years set review_signed_off_at = now() where id = '30000000-0000-0000-0000-000000000001';
select is((select review_signed_off_by from public.client_tax_years where id = '30000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-0000000000a2'::uuid, 'sign-off is stamped with the reviewer');
update public.client_tax_years set return_status = 'sent_for_client_approval' where id = '30000000-0000-0000-0000-000000000001';
select is((select return_status::text from public.client_tax_years where id = '30000000-0000-0000-0000-000000000001'),
  'sent_for_client_approval', 'after sign-off the return moves on');

update public.client_tax_years set return_status = 'in_preparation' where id = '30000000-0000-0000-0000-000000000001';
select is((select review_signed_off_at from public.client_tax_years where id = '30000000-0000-0000-0000-000000000001'),
  null, 'sending back for rework clears the sign-off');
select is((select status::text from public.tasks where client_tax_year_id = '30000000-0000-0000-0000-000000000001'
            and title like 'Get client approval%'), 'cancelled', 'sending back cancels auto-tasks for later stages');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select throws_ok(
  $$ insert into public.client_tax_years (client_id, tax_year, return_status) values ('10000000-0000-0000-0000-000000000001', 2025, 'filed') $$,
  'P0001', null, 'only an Owner can import a return already past review');

-- ---------------------------------------------------------------------------
-- Wealth reconciliation
-- ---------------------------------------------------------------------------
insert into public.wealth_items (client_tax_year_id, category, description, cost, is_cash_equivalent) values
  ('30000000-0000-0000-0000-000000000001', 'bank_balance', 'HBL current account', 1500000, true),
  ('30000000-0000-0000-0000-000000000001', 'vehicle', 'Toyota Corolla 2019', 3000000, false),
  ('30000000-0000-0000-0000-000000000001', 'liabilities', 'Car loan', 1000000, false);
select is((select client_id from public.wealth_items limit 1), '10000000-0000-0000-0000-000000000001'::uuid,
  'wealth item inherits client_id from the client-year');
-- expected = 1,000,000 + 2,400,000 - 1,200,000 = 2,200,000; closing = 4,500,000 - 1,000,000 = 3,500,000
select is((select wealth_gap from public.v_client_tax_years where id = '30000000-0000-0000-0000-000000000001'),
  1300000.00::numeric, 'wealth gap = closing net assets - expected closing');
select is((select wealth_cash_equivalents from public.v_client_tax_years where id = '30000000-0000-0000-0000-000000000001'),
  1500000.00::numeric, 'cash-equivalent assets totalled');

-- ---------------------------------------------------------------------------
-- Optimistic locking token and audit log
-- ---------------------------------------------------------------------------
create temp table lock_token as select updated_at from public.client_tax_years where id = '30000000-0000-0000-0000-000000000001';
grant select on lock_token to authenticated;
update public.client_tax_years set income_salary = 2500000 where id = '30000000-0000-0000-0000-000000000001';
select is_empty(
  $$ update public.client_tax_years set income_salary = 1 where id = '30000000-0000-0000-0000-000000000001'
     and updated_at = (select updated_at from lock_token) returning id $$,
  'a stale updated_at matches no row (conflict detected)');

select is((select changed_fields from public.activity_log where table_name = 'client_tax_years' and action = 'update'
           order by id desc limit 1), array['income_salary'], 'audit log records the changed fields');
select is((select actor_id from public.activity_log where table_name = 'client_tax_years' and action = 'update'
           order by id desc limit 1), '00000000-0000-0000-0000-0000000000a1'::uuid, 'audit log records who');

-- Soft delete is logged as delete
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.clients set deleted_at = now() where id = '10000000-0000-0000-0000-000000000002';
select is((select action from public.activity_log where record_id = '10000000-0000-0000-0000-000000000002' order by id desc limit 1),
  'delete', 'soft delete is logged as a delete');

-- ---------------------------------------------------------------------------
-- Comments and mentions
-- ---------------------------------------------------------------------------
insert into public.comments (entity_type, entity_id, client_id, body, mentions)
values ('client', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
        '@Associate A please chase the bank statement', array['00000000-0000-0000-0000-0000000000a1']::uuid[]);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
select is((select count(*)::int from public.notifications where kind = 'mention'), 1, '@mention creates a notification');

-- ---------------------------------------------------------------------------
-- Vault: ciphertext is never selectable by app users
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.credentials (client_id, portal, username, secret_ciphertext)
values ('10000000-0000-0000-0000-000000000001', 'IRIS', '3520212345671', 'v1:abc:def:ghi');
select throws_ok($$ select secret_ciphertext from public.credentials $$, '42501', null, 'ciphertext column is not selectable');
select ok((select bool_and(not (coalesce(after, '{}'::jsonb) ? 'secret_ciphertext')) from public.activity_log where table_name = 'credentials'),
  'ciphertext never written to the activity log');

select * from finish();
rollback;
