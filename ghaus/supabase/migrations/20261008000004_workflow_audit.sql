-- Workflow (review gate, auto-tasks, notifications), audit log, cross-firm
-- reference guard, and attaching the shared triggers to every table.

-- ---------------------------------------------------------------------------
-- Pipeline ranks
-- ---------------------------------------------------------------------------
create or replace function app.return_rank(s public.return_status)
returns integer language sql immutable
as $$ select array_position(enum_range(null::public.return_status), s) $$;

create or replace function app.notice_rank(s public.notice_status)
returns integer language sql immutable
as $$ select array_position(enum_range(null::public.notice_status), s) $$;

-- ---------------------------------------------------------------------------
-- Cross-firm reference guard. Foreign keys bypass RLS, so without this a user
-- could point a row at another firm's client. Args are 'column:table' pairs.
-- ---------------------------------------------------------------------------
create or replace function app.check_firm_refs()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  pair text;
  col text;
  tbl text;
  val uuid;
  ok boolean;
  row_json jsonb := to_jsonb(new);
begin
  foreach pair in array tg_argv loop
    col := split_part(pair, ':', 1);
    tbl := split_part(pair, ':', 2);
    val := (row_json ->> col)::uuid;
    if val is not null then
      execute format('select exists (select 1 from public.%I where id = $1 and firm_id = $2)', tbl)
        into ok using val, new.firm_id;
      if not ok then
        raise exception '%.% does not belong to this firm', tg_table_name, col using errcode = '23503';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications helper
-- ---------------------------------------------------------------------------
create or replace function app.notify(
  p_firm_id uuid, p_user_id uuid, p_kind text, p_title text, p_body text,
  p_link text, p_entity_type text, p_entity_id uuid
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user_id is null or p_user_id is not distinct from auth.uid() then
    return; -- never notify people about their own actions
  end if;
  insert into public.notifications (firm_id, user_id, kind, title, body, link, entity_type, entity_id, created_by, updated_by)
  values (p_firm_id, p_user_id, p_kind, p_title, p_body, p_link, p_entity_type, p_entity_id, auth.uid(), auth.uid());
end;
$$;

create or replace function app.tax_year_label(p_ty integer)
returns text language sql immutable
as $$ select 'TY' || p_ty $$;

-- ---------------------------------------------------------------------------
-- Return workflow: review gate + sign-off bookkeeping (BEFORE)
-- ---------------------------------------------------------------------------
create or replace function app.return_workflow_before()
returns trigger
language plpgsql
as $$
declare
  review_rank constant integer := app.return_rank('under_review');
  gate_rank constant integer := app.return_rank('sent_for_client_approval');
  filed_rank constant integer := app.return_rank('filed');
  is_user boolean := current_user = 'authenticated';
begin
  if tg_op = 'INSERT' then
    -- Creating a record already past review is a historical import: Owner only.
    if is_user and app.return_rank(new.return_status) >= gate_rank and not app.is_owner() then
      raise exception 'Review sign-off required: only an Owner can create a return that is already past review'
        using errcode = 'P0001';
    end if;
    new.review_signed_off_by := null;
    new.review_signed_off_at := case when app.return_rank(new.return_status) >= gate_rank then now() end;
    if app.return_rank(new.return_status) >= filed_rank and new.filed_on is null then
      new.filed_on := (now() at time zone 'Asia/Karachi')::date;
    end if;
    return new;
  end if;

  -- Sign-off: only while under review, only by the reviewer or an Owner. The
  -- client cannot choose who/when; we stamp it.
  if new.review_signed_off_at is not null and old.review_signed_off_at is null then
    if old.return_status <> 'under_review' then
      raise exception 'A return can only be signed off while it is Under review' using errcode = 'P0001';
    end if;
    if is_user and not (auth.uid() = new.reviewer_id or app.is_owner()) then
      raise exception 'Only the assigned reviewer or an Owner can sign off this return' using errcode = '42501';
    end if;
    new.review_signed_off_by := auth.uid();
    new.review_signed_off_at := now();
  else
    new.review_signed_off_by := old.review_signed_off_by;
    new.review_signed_off_at := old.review_signed_off_at;
  end if;

  -- Sent back before review: the sign-off no longer applies.
  if app.return_rank(new.return_status) < review_rank then
    new.review_signed_off_by := null;
    new.review_signed_off_at := null;
  end if;

  -- The gate.
  if app.return_rank(new.return_status) >= gate_rank and app.return_rank(old.return_status) < gate_rank
     and new.review_signed_off_at is null then
    raise exception 'Review sign-off required: a return cannot move past Under review until the reviewer signs off'
      using errcode = 'P0001';
  end if;

  if app.return_rank(new.return_status) >= filed_rank and new.filed_on is null then
    new.filed_on := (now() at time zone 'Asia/Karachi')::date;
  end if;
  return new;
end;
$$;

-- Notice workflow: a reply cannot be Submitted without reviewer sign-off.
create or replace function app.notice_workflow_before()
returns trigger
language plpgsql
as $$
declare
  is_user boolean := current_user = 'authenticated';
begin
  if tg_op = 'INSERT' then
    if is_user and new.status = 'submitted' and not app.is_owner() then
      raise exception 'Review sign-off required: only an Owner can create a notice that is already submitted'
        using errcode = 'P0001';
    end if;
    new.review_signed_off_by := null;
    new.review_signed_off_at := case when app.notice_rank(new.status) >= app.notice_rank('submitted') then now() end;
    if new.reply_due_date is null and new.section_id is not null then
      select coalesce(new.received_date, new.issue_date, (now() at time zone 'Asia/Karachi')::date) + s.default_reply_days
        into new.reply_due_date
      from public.notice_sections s where s.id = new.section_id;
    end if;
    return new;
  end if;

  if new.review_signed_off_at is not null and old.review_signed_off_at is null then
    if old.status <> 'under_review' then
      raise exception 'A reply can only be signed off while it is Under review' using errcode = 'P0001';
    end if;
    if is_user and not (auth.uid() = new.reviewer_id or app.is_owner()) then
      raise exception 'Only the assigned reviewer or an Owner can sign off this reply' using errcode = '42501';
    end if;
    new.review_signed_off_by := auth.uid();
    new.review_signed_off_at := now();
  else
    new.review_signed_off_by := old.review_signed_off_by;
    new.review_signed_off_at := old.review_signed_off_at;
  end if;

  if new.status in ('received', 'reply_drafted') then
    new.review_signed_off_by := null;
    new.review_signed_off_at := null;
  end if;

  if new.status = 'submitted' and old.status <> 'submitted' and new.review_signed_off_at is null then
    raise exception 'Review sign-off required: a reply cannot be Submitted until the reviewer signs off'
      using errcode = 'P0001';
  end if;

  if new.status = 'submitted' and new.submitted_on is null then
    new.submitted_on := (now() at time zone 'Asia/Karachi')::date;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- After a pipeline move: create tasks from pipeline_task_rules, close the
-- auto-tasks of earlier stages on a forward move, and notify people.
-- ---------------------------------------------------------------------------
create or replace function app.return_workflow_after()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_client text;
  v_link text;
  new_rank integer := app.return_rank(new.return_status);
begin
  if tg_op = 'UPDATE' and new.return_status = old.return_status then
    -- Reassignment notifications
    if new.assignee_id is distinct from old.assignee_id then
      select name into v_client from public.clients where id = new.client_id;
      perform app.notify(new.firm_id, new.assignee_id, 'assigned', 'Return assigned to you',
        v_client || ' · ' || app.tax_year_label(new.tax_year), '/clients/' || new.client_id || '?ty=' || new.tax_year,
        'client_tax_year', new.id);
    end if;
    if new.reviewer_id is distinct from old.reviewer_id then
      select name into v_client from public.clients where id = new.client_id;
      perform app.notify(new.firm_id, new.reviewer_id, 'assigned', 'You are now the reviewer for a return',
        v_client || ' · ' || app.tax_year_label(new.tax_year), '/clients/' || new.client_id || '?ty=' || new.tax_year,
        'client_tax_year', new.id);
    end if;
    return null;
  end if;

  select name into v_client from public.clients where id = new.client_id;
  v_link := '/clients/' || new.client_id || '?ty=' || new.tax_year;

  -- Forward move: auto-tasks whose work is now finished are done.
  -- Backward move (sent back): auto-tasks for stages not yet reached again are cancelled.
  if tg_op = 'UPDATE' and new_rank > app.return_rank(old.return_status) then
    update public.tasks t
       set status = 'done'
      from public.pipeline_task_rules pr
     where t.client_tax_year_id = new.id
       and t.auto_rule_id = pr.id
       and t.status in ('open', 'in_progress')
       and t.deleted_at is null
       and pr.entity = 'return'
       and new_rank >= coalesce(app.return_rank(pr.complete_on_status::public.return_status),
                                app.return_rank(pr.on_status::public.return_status) + 1);
  elsif tg_op = 'UPDATE' and new_rank < app.return_rank(old.return_status) then
    update public.tasks t
       set status = 'cancelled'
      from public.pipeline_task_rules pr
     where t.client_tax_year_id = new.id
       and t.auto_rule_id = pr.id
       and t.status in ('open', 'in_progress')
       and t.deleted_at is null
       and pr.entity = 'return'
       and app.return_rank(pr.on_status::public.return_status) > new_rank;
  end if;

  for r in
    select * from public.pipeline_task_rules
    where firm_id = new.firm_id and entity = 'return' and on_status = new.return_status::text
      and is_active and deleted_at is null
  loop
    insert into public.tasks (firm_id, title, client_id, client_tax_year_id, assignee_id, due_date, auto_rule_id, created_by, updated_by)
    values (
      new.firm_id,
      replace(replace(r.title, '{client}', coalesce(v_client, '')), '{ty}', app.tax_year_label(new.tax_year)),
      new.client_id, new.id,
      case when r.assign_to = 'reviewer' then coalesce(new.reviewer_id, new.assignee_id) else new.assignee_id end,
      (now() at time zone 'Asia/Karachi')::date + r.due_in_days,
      r.id, auth.uid(), auth.uid()
    );
  end loop;

  if tg_op = 'UPDATE' then
    if new.return_status = 'under_review' then
      perform app.notify(new.firm_id, new.reviewer_id, 'review_requested', 'Return waiting for your review',
        v_client || ' · ' || app.tax_year_label(new.tax_year), v_link, 'client_tax_year', new.id);
    elsif old.return_status = 'under_review' and new_rank < app.return_rank('under_review') then
      perform app.notify(new.firm_id, new.assignee_id, 'sent_back', 'Return sent back for rework',
        v_client || ' · ' || app.tax_year_label(new.tax_year), v_link, 'client_tax_year', new.id);
    elsif new.return_status = 'sent_for_client_approval' and old.return_status = 'under_review' then
      perform app.notify(new.firm_id, new.assignee_id, 'signed_off', 'Return signed off',
        v_client || ' · ' || app.tax_year_label(new.tax_year), v_link, 'client_tax_year', new.id);
    end if;
  end if;
  return null;
end;
$$;

create or replace function app.notice_workflow_after()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_client text;
  v_link text;
  new_rank integer := app.notice_rank(new.status);
begin
  select name into v_client from public.clients where id = new.client_id;
  v_link := '/notices/' || new.id;

  if tg_op = 'UPDATE' and new.status = old.status then
    if new.assignee_id is distinct from old.assignee_id then
      perform app.notify(new.firm_id, new.assignee_id, 'assigned', 'Notice assigned to you',
        v_client || ' · ' || new.section, v_link, 'notice', new.id);
    end if;
    if new.reviewer_id is distinct from old.reviewer_id then
      perform app.notify(new.firm_id, new.reviewer_id, 'assigned', 'You are now the reviewer for a notice',
        v_client || ' · ' || new.section, v_link, 'notice', new.id);
    end if;
    return null;
  end if;

  if tg_op = 'UPDATE' and new_rank > app.notice_rank(old.status) then
    update public.tasks t
       set status = 'done'
      from public.pipeline_task_rules pr
     where t.notice_id = new.id
       and t.auto_rule_id = pr.id
       and t.status in ('open', 'in_progress')
       and t.deleted_at is null
       and pr.entity = 'notice'
       and new_rank >= coalesce(app.notice_rank(pr.complete_on_status::public.notice_status),
                                app.notice_rank(pr.on_status::public.notice_status) + 1);
  elsif tg_op = 'UPDATE' and new_rank < app.notice_rank(old.status) then
    update public.tasks t
       set status = 'cancelled'
      from public.pipeline_task_rules pr
     where t.notice_id = new.id
       and t.auto_rule_id = pr.id
       and t.status in ('open', 'in_progress')
       and t.deleted_at is null
       and pr.entity = 'notice'
       and app.notice_rank(pr.on_status::public.notice_status) > new_rank;
  end if;

  for r in
    select * from public.pipeline_task_rules
    where firm_id = new.firm_id and entity = 'notice' and on_status = new.status::text
      and is_active and deleted_at is null
  loop
    insert into public.tasks (firm_id, title, client_id, notice_id, assignee_id, due_date, auto_rule_id, created_by, updated_by)
    values (
      new.firm_id,
      replace(replace(r.title, '{client}', coalesce(v_client, '')), '{ty}', coalesce(app.tax_year_label(new.tax_year), '')),
      new.client_id, new.id,
      case when r.assign_to = 'reviewer' then coalesce(new.reviewer_id, new.assignee_id) else new.assignee_id end,
      least((now() at time zone 'Asia/Karachi')::date + r.due_in_days, coalesce(new.reply_due_date, 'infinity'::date)),
      r.id, auth.uid(), auth.uid()
    );
  end loop;

  if tg_op = 'UPDATE' and new.status = 'under_review' then
    perform app.notify(new.firm_id, new.reviewer_id, 'review_requested', 'Notice reply waiting for your review',
      v_client || ' · ' || new.section, v_link, 'notice', new.id);
  elsif tg_op = 'UPDATE' and old.status = 'under_review' and new.status in ('received', 'reply_drafted') then
    perform app.notify(new.firm_id, new.assignee_id, 'sent_back', 'Notice reply sent back for rework',
      v_client || ' · ' || new.section, v_link, 'notice', new.id);
  elsif tg_op = 'INSERT' then
    perform app.notify(new.firm_id, new.assignee_id, 'assigned', 'Notice assigned to you',
      v_client || ' · ' || new.section, v_link, 'notice', new.id);
  end if;
  return null;
end;
$$;

-- Tasks: notify on (re)assignment; keep completed_at in step with status.
create or replace function app.task_before()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create or replace function app.task_after()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    perform app.notify(new.firm_id, new.assignee_id, 'task_assigned', 'New task: ' || new.title,
      case when new.due_date is not null then 'Due ' || to_char(new.due_date, 'DD-MM-YYYY') end,
      '/tasks', 'task', new.id);
  end if;
  return null;
end;
$$;

-- Comments: @mentions notify; mentions must be members of the same firm.
create or replace function app.comment_after()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_author text;
  v_client text;
  v_link text;
  v_ty smallint;
begin
  select full_name into v_author from public.users where id = new.created_by;
  select name into v_client from public.clients where id = new.client_id;
  if new.entity_type = 'client_tax_year' then
    select tax_year into v_ty from public.client_tax_years where id = new.entity_id;
    v_link := '/clients/' || new.client_id || '?ty=' || v_ty || '#comments';
  elsif new.entity_type = 'notice' then
    v_link := '/notices/' || new.entity_id;
  elsif new.entity_type = 'appeal' then
    v_link := '/appeals/' || new.entity_id;
  else
    v_link := '/clients/' || new.client_id;
  end if;

  foreach v_user in array new.mentions loop
    if exists (select 1 from public.users where id = v_user and firm_id = new.firm_id and is_active and deleted_at is null) then
      perform app.notify(new.firm_id, v_user, 'mention',
        coalesce(v_author, 'Someone') || ' mentioned you on ' || coalesce(v_client, 'a client'),
        left(new.body, 200), v_link, new.entity_type, new.entity_id);
    end if;
  end loop;
  return null;
end;
$$;

-- Comments can only be edited by their author; the body is the only editable field.
create or replace function app.comment_before_update()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' and old.created_by is distinct from auth.uid() then
    raise exception 'You can only edit your own comments' using errcode = '42501';
  end if;
  new.entity_type := old.entity_type;
  new.entity_id := old.entity_id;
  new.client_id := old.client_id;
  new.mentions := old.mentions;
  return new;
end;
$$;

-- Wealth items always carry the client of their client-year.
create or replace function app.wealth_item_before()
returns trigger
language plpgsql
as $$
begin
  select client_id into new.client_id from public.client_tax_years where id = new.client_tax_year_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------
create or replace function app.audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_module public.app_module := nullif(tg_argv[0], 'none')::public.app_module;
  v_before jsonb;
  v_after jsonb;
  v_action text;
  v_changed text[];
  v_row jsonb;
  v_client uuid;
  v_noise constant text[] := array['updated_at', 'updated_by', 'search_digits', 'secret_ciphertext', 'created_at', 'created_by'];
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_after := to_jsonb(new);
    v_row := v_after;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_row := v_after;
    select array_agg(k order by k) into v_changed
    from jsonb_object_keys(v_after) k
    where not (k = any (v_noise)) and (v_before -> k) is distinct from (v_after -> k);
    if v_changed is null then
      return null; -- nothing meaningful changed
    end if;
    if old.deleted_at is null and new.deleted_at is not null then
      v_action := 'delete';
    elsif old.deleted_at is not null and new.deleted_at is null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
  else
    v_action := 'delete';
    v_before := to_jsonb(old);
    v_row := v_before;
  end if;

  -- Secrets never reach the log.
  v_before := v_before - 'secret_ciphertext' - 'search_digits';
  v_after := v_after - 'secret_ciphertext' - 'search_digits';

  v_client := case when tg_table_name = 'clients' then (v_row ->> 'id')::uuid else (v_row ->> 'client_id')::uuid end;

  insert into public.activity_log (firm_id, module, table_name, record_id, client_id, action, actor_id, changed_fields, before, after)
  values (
    coalesce((v_row ->> 'firm_id')::uuid, (v_row ->> 'id')::uuid),
    v_module, tg_table_name, (v_row ->> 'id')::uuid, v_client, v_action, auth.uid(), v_changed,
    case when v_action = 'insert' then null else v_before end,
    v_after
  );
  return null;
end;
$$;

-- Explicit events (credential reveal, exports) from server code.
create or replace function public.log_event(p_table text, p_record_id uuid, p_action text, p_details jsonb default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_firm uuid := app.firm_id();
  v_client uuid;
begin
  if v_firm is null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_action not in ('reveal', 'export') then
    raise exception 'Unsupported event %', p_action using errcode = '22023';
  end if;
  if p_table = 'credentials' then
    select client_id into v_client from public.credentials where id = p_record_id and firm_id = v_firm;
  elsif p_table = 'clients' then
    v_client := p_record_id;
  end if;
  insert into public.activity_log (firm_id, module, table_name, record_id, client_id, action, actor_id, after)
  values (v_firm, case when p_table = 'credentials' then 'vault'::public.app_module end, p_table, p_record_id, v_client, p_action, auth.uid(), p_details);
end;
$$;

-- ---------------------------------------------------------------------------
-- Attach shared triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('firms', 'settings'),
      ('roles', 'settings'),
      ('role_permissions', 'settings'),
      ('users', 'settings'),
      ('clients', 'clients'),
      ('client_registrations', 'clients'),
      ('client_relations', 'clients'),
      ('client_tax_years', 'returns'),
      ('wealth_items', 'returns'),
      ('deadline_rules', 'settings'),
      ('deadline_overrides', 'settings'),
      ('notice_sections', 'settings'),
      ('document_types', 'settings'),
      ('message_templates', 'settings'),
      ('pipeline_task_rules', 'settings'),
      ('notices', 'notices'),
      ('appeals', 'notices'),
      ('hearings', 'notices'),
      ('documents', 'clients'),
      ('tasks', 'none'),
      ('comments', 'clients'),
      ('notifications', null),
      ('fee_agreements', 'fees'),
      ('invoices', 'fees'),
      ('payments', 'fees'),
      ('credentials', 'vault')
    ) as v(tbl, module)
  loop
    execute format('create trigger touch before insert or update on public.%I for each row execute function app.touch()', t.tbl);
    if t.tbl <> 'firms' then
      -- firm_id defaults to the caller's firm, so app code never passes it
      execute format('alter table public.%I alter column firm_id set default app.firm_id()', t.tbl);
    end if;
    if t.module is not null then
      execute format('create trigger audit after insert or update or delete on public.%I for each row execute function app.audit(%L)', t.tbl, t.module);
    end if;
  end loop;
end;
$$;

create trigger b0_guard_users before insert or update on public.users
  for each row execute function app.guard_users();
create trigger b0_guard_role_permissions before insert or update on public.role_permissions
  for each row execute function app.guard_role_permissions();

-- Cross-firm reference guards (BEFORE triggers fire in name order: a*, b*, c*, then touch)
create trigger a1_firm_refs before insert or update on public.users
  for each row execute function app.check_firm_refs('role_id:roles');
create trigger a1_firm_refs before insert or update on public.role_permissions
  for each row execute function app.check_firm_refs('role_id:roles');
create trigger a1_firm_refs before insert or update on public.clients
  for each row execute function app.check_firm_refs('assignee_id:users', 'reviewer_id:users');
create trigger a1_firm_refs before insert or update on public.client_registrations
  for each row execute function app.check_firm_refs('client_id:clients');
create trigger a1_firm_refs before insert or update on public.client_relations
  for each row execute function app.check_firm_refs('client_id:clients', 'related_client_id:clients');
create trigger a1_firm_refs before insert or update on public.client_tax_years
  for each row execute function app.check_firm_refs('client_id:clients', 'assignee_id:users', 'reviewer_id:users');
create trigger a1_firm_refs before insert or update on public.wealth_items
  for each row execute function app.check_firm_refs('client_tax_year_id:client_tax_years');
create trigger a1_firm_refs before insert or update on public.deadline_overrides
  for each row execute function app.check_firm_refs('rule_id:deadline_rules');
create trigger a1_firm_refs before insert or update on public.notices
  for each row execute function app.check_firm_refs('client_id:clients', 'client_tax_year_id:client_tax_years',
    'section_id:notice_sections', 'assignee_id:users', 'reviewer_id:users');
create trigger a1_firm_refs before insert or update on public.appeals
  for each row execute function app.check_firm_refs('client_id:clients', 'notice_id:notices', 'parent_appeal_id:appeals',
    'assignee_id:users', 'reviewer_id:users');
create trigger a1_firm_refs before insert or update on public.hearings
  for each row execute function app.check_firm_refs('client_id:clients', 'notice_id:notices', 'appeal_id:appeals',
    'appearing_user_id:users');
create trigger a1_firm_refs before insert or update on public.documents
  for each row execute function app.check_firm_refs('client_id:clients', 'client_tax_year_id:client_tax_years',
    'notice_id:notices', 'appeal_id:appeals', 'document_type_id:document_types');
create trigger a1_firm_refs before insert or update on public.tasks
  for each row execute function app.check_firm_refs('client_id:clients', 'client_tax_year_id:client_tax_years',
    'notice_id:notices', 'appeal_id:appeals', 'assignee_id:users');
create trigger a1_firm_refs before insert or update on public.comments
  for each row execute function app.check_firm_refs('client_id:clients');
create trigger a1_firm_refs before insert or update on public.fee_agreements
  for each row execute function app.check_firm_refs('client_id:clients', 'client_tax_year_id:client_tax_years',
    'notice_id:notices', 'appeal_id:appeals');
create trigger a1_firm_refs before insert or update on public.invoices
  for each row execute function app.check_firm_refs('client_id:clients', 'fee_agreement_id:fee_agreements');
create trigger a1_firm_refs before insert or update on public.payments
  for each row execute function app.check_firm_refs('client_id:clients', 'invoice_id:invoices');
create trigger a1_firm_refs before insert or update on public.credentials
  for each row execute function app.check_firm_refs('client_id:clients');

-- Workflow triggers
create trigger c0_workflow before insert or update on public.client_tax_years
  for each row execute function app.return_workflow_before();
create trigger workflow_after after insert or update on public.client_tax_years
  for each row execute function app.return_workflow_after();
create trigger c0_workflow before insert or update on public.notices
  for each row execute function app.notice_workflow_before();
create trigger workflow_after after insert or update on public.notices
  for each row execute function app.notice_workflow_after();
create trigger c0_task before insert or update on public.tasks
  for each row execute function app.task_before();
create trigger task_after after insert or update on public.tasks
  for each row execute function app.task_after();
create trigger comment_after after insert on public.comments
  for each row execute function app.comment_after();
create trigger c0_comment before update on public.comments
  for each row execute function app.comment_before_update();
create trigger a2_wealth_item before insert or update on public.wealth_items
  for each row execute function app.wealth_item_before();
