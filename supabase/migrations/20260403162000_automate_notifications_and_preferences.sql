alter table public.notifications
add column if not exists source_key text;

create unique index if not exists notifications_user_source_key_idx
on public.notifications (user_id, source_key)
where source_key is not null;

create or replace function public.create_notification_if_enabled(
  _user_id uuid,
  _title text,
  _message text,
  _category public.notification_category default 'system',
  _type public.notification_type default 'info',
  _action_url text default null,
  _action_label text default null,
  _metadata jsonb default '{}'::jsonb,
  _source_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _preferences public.notification_preferences%rowtype;
  _notification_id uuid;
begin
  if _user_id is null or not public.is_active_user(_user_id) then
    return null;
  end if;

  insert into public.notification_preferences (user_id)
  values (_user_id)
  on conflict (user_id) do nothing;

  select *
    into _preferences
  from public.notification_preferences
  where user_id = _user_id;

  if (_category = 'lead' and not _preferences.lead_enabled)
    or (_category = 'task' and not _preferences.task_enabled)
    or (_category = 'sale' and not _preferences.sale_enabled)
    or (_category = 'security' and not _preferences.security_enabled)
    or (_category = 'system' and not _preferences.system_enabled) then
    return null;
  end if;

  if _source_key is null then
    insert into public.notifications (
      user_id,
      title,
      message,
      category,
      type,
      action_url,
      action_label,
      metadata
    ) values (
      _user_id,
      _title,
      _message,
      _category,
      _type,
      _action_url,
      _action_label,
      coalesce(_metadata, '{}'::jsonb)
    )
    returning id into _notification_id;

    return _notification_id;
  end if;

  insert into public.notifications (
    user_id,
    title,
    message,
    category,
    type,
    action_url,
    action_label,
    metadata,
    source_key,
    read_at
  ) values (
    _user_id,
    _title,
    _message,
    _category,
    _type,
    _action_url,
    _action_label,
    coalesce(_metadata, '{}'::jsonb),
    _source_key,
    null
  )
  on conflict (user_id, source_key) where source_key is not null
  do update set
    title = excluded.title,
    message = excluded.message,
    category = excluded.category,
    type = excluded.type,
    action_url = excluded.action_url,
    action_label = excluded.action_label,
    metadata = excluded.metadata,
    read_at = null,
    created_at = timezone('utc', now())
  returning id into _notification_id;

  return _notification_id;
end;
$$;

create or replace function public.sync_notification_automation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _current_user_id uuid := auth.uid();
  _task_count integer := 0;
  _lead_count integer := 0;
  _sale_count integer := 0;
begin
  if _current_user_id is null then
    return jsonb_build_object('tasks', 0, 'leads', 0, 'sales', 0);
  end if;

  delete from public.notifications n
  where n.user_id = _current_user_id
    and n.source_key like 'task-overdue:%'
    and not exists (
      select 1
      from public.tarefas t
      where t.id::text = split_part(n.source_key, ':', 2)
        and t.responsavel_id = _current_user_id
        and t.status not in ('concluida', 'cancelada')
        and t.data_vencimento is not null
        and t.data_vencimento::date < current_date
    );

  delete from public.notifications n
  where n.user_id = _current_user_id
    and n.source_key like 'lead-stalled:%'
    and not exists (
      select 1
      from public.lead_status ls
      where ls.telefone = split_part(n.source_key, ':', 2)
        and ls.assigned_to = _current_user_id
        and coalesce(ls.updated_at, '-infinity'::timestamptz) <= timezone('utc', now()) - interval '48 hours'
        and coalesce(ls.status, 'novo_lead') not in ('vendido', 'perdido')
    );

  delete from public.notifications n
  where n.user_id = _current_user_id
    and n.source_key like 'prevenda-stalled:%'
    and not exists (
      select 1
      from public.prevenda_contatos pc
      where pc.id::text = split_part(n.source_key, ':', 2)
        and pc.assigned_to = _current_user_id
        and coalesce(pc.updated_at, pc.created_at) <= timezone('utc', now()) - interval '72 hours'
        and coalesce(pc.status, 'novo_lead') not in ('comprado', 'standby')
    );

  insert into public.notification_preferences (user_id)
  values (_current_user_id)
  on conflict (user_id) do nothing;

  for _task_count in
    select count(*)::integer
    from public.tarefas t
    where t.responsavel_id = _current_user_id
      and t.status not in ('concluida', 'cancelada')
      and t.data_vencimento is not null
      and t.data_vencimento::date < current_date
  loop
    exit;
  end loop;

  insert into public.notifications (
    user_id,
    title,
    message,
    category,
    type,
    action_url,
    action_label,
    metadata,
    source_key,
    read_at
  )
  select
    _current_user_id,
    'Tarefa vencida',
    format('A tarefa "%s" venceu em %s e continua pendente.', t.titulo, to_char(t.data_vencimento::date, 'DD/MM/YYYY')),
    'task',
    'warning',
    '/tarefas',
    'Abrir tarefas',
    jsonb_build_object('task_id', t.id, 'due_date', t.data_vencimento, 'status', t.status),
    'task-overdue:' || t.id::text,
    null
  from public.tarefas t
  join public.notification_preferences np
    on np.user_id = _current_user_id
  where t.responsavel_id = _current_user_id
    and np.task_enabled = true
    and t.status not in ('concluida', 'cancelada')
    and t.data_vencimento is not null
    and t.data_vencimento::date < current_date
  on conflict (user_id, source_key) where source_key is not null
  do update set
    title = excluded.title,
    message = excluded.message,
    metadata = excluded.metadata,
    type = excluded.type,
    category = excluded.category,
    action_url = excluded.action_url,
    action_label = excluded.action_label,
    read_at = null,
    created_at = timezone('utc', now());

  insert into public.notifications (
    user_id,
    title,
    message,
    category,
    type,
    action_url,
    action_label,
    metadata,
    source_key,
    read_at
  )
  select
    _current_user_id,
    'Lead sem andamento',
    format('O lead %s está sem atualização há mais de 48 horas.', coalesce(nullif(ls.veiculo_interesse, ''), ls.telefone)),
    'lead',
    'warning',
    '/leads',
    'Ver leads',
    jsonb_build_object('telefone', ls.telefone, 'status', ls.status, 'updated_at', ls.updated_at),
    'lead-stalled:' || ls.telefone,
    null
  from public.lead_status ls
  join public.notification_preferences np
    on np.user_id = _current_user_id
  where ls.assigned_to = _current_user_id
    and np.lead_enabled = true
    and coalesce(ls.updated_at, '-infinity'::timestamptz) <= timezone('utc', now()) - interval '48 hours'
    and coalesce(ls.status, 'novo_lead') not in ('vendido', 'perdido')
  on conflict (user_id, source_key) where source_key is not null
  do update set
    title = excluded.title,
    message = excluded.message,
    metadata = excluded.metadata,
    type = excluded.type,
    category = excluded.category,
    action_url = excluded.action_url,
    action_label = excluded.action_label,
    read_at = null,
    created_at = timezone('utc', now());

  insert into public.notifications (
    user_id,
    title,
    message,
    category,
    type,
    action_url,
    action_label,
    metadata,
    source_key,
    read_at
  )
  select
    _current_user_id,
    'Pré-venda parada',
    format('O lead de pré-venda %s está sem atualização há mais de 72 horas.', coalesce(nullif(pc.nome, ''), pc.telefone_whatsapp, 'sem identificação')),
    'lead',
    'warning',
    '/prevenda',
    'Ver pré-venda',
    jsonb_build_object('prevenda_id', pc.id, 'status', pc.status, 'updated_at', coalesce(pc.updated_at, pc.created_at)),
    'prevenda-stalled:' || pc.id::text,
    null
  from public.prevenda_contatos pc
  join public.notification_preferences np
    on np.user_id = _current_user_id
  where pc.assigned_to = _current_user_id
    and np.lead_enabled = true
    and coalesce(pc.updated_at, pc.created_at) <= timezone('utc', now()) - interval '72 hours'
    and coalesce(pc.status, 'novo_lead') not in ('comprado', 'standby')
  on conflict (user_id, source_key) where source_key is not null
  do update set
    title = excluded.title,
    message = excluded.message,
    metadata = excluded.metadata,
    type = excluded.type,
    category = excluded.category,
    action_url = excluded.action_url,
    action_label = excluded.action_label,
    read_at = null,
    created_at = timezone('utc', now());

  select count(*)::integer into _task_count
  from public.notifications
  where user_id = _current_user_id
    and source_key like 'task-overdue:%';

  select count(*)::integer into _lead_count
  from public.notifications
  where user_id = _current_user_id
    and (source_key like 'lead-stalled:%' or source_key like 'prevenda-stalled:%');

  select count(*)::integer into _sale_count
  from public.notifications
  where user_id = _current_user_id
    and source_key like 'sale-created:%';

  return jsonb_build_object(
    'tasks', _task_count,
    'leads', _lead_count,
    'sales', _sale_count
  );
end;
$$;

create or replace function public.notify_sale_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _recipient_id uuid;
  _vehicle_name text;
  _sale_amount text;
  _message text;
begin
  _vehicle_name := coalesce(
    nullif(NEW.nome_veiculo, ''),
    trim(concat_ws(' ', NEW.marca_veiculo, NEW.modelo_veiculo)),
    'veículo sem identificação'
  );

  _sale_amount := case
    when NEW.preco_venda is null then 'valor não informado'
    else to_char(NEW.preco_venda, 'FM"R$" 999G999G990D00')
  end;

  _message := format(
    'Venda registrada para %s em %s.',
    _vehicle_name,
    _sale_amount
  );

  for _recipient_id in
    select distinct recipient_id
    from (
      select NEW.vendedor_id as recipient_id
      union all
      select ur.user_id as recipient_id
      from public.user_roles ur
      join public.profiles p
        on p.id = ur.user_id
      where ur.role in ('admin', 'gerente')
        and p.is_active = true
    ) recipients
    where recipient_id is not null
  loop
    perform public.create_notification_if_enabled(
      _recipient_id,
      'Nova venda registrada',
      _message,
      'sale',
      'success',
      '/vendas',
      'Abrir vendas',
      jsonb_build_object(
        'sale_id', NEW.id,
        'vehicle_id', NEW.vehicle_id,
        'seller_id', NEW.vendedor_id,
        'price', NEW.preco_venda,
        'sale_date', NEW.data_venda
      ),
      'sale-created:' || NEW.id::text
    );
  end loop;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_sale_created on public.vendas;

create trigger trg_notify_sale_created
after insert on public.vendas
for each row
execute function public.notify_sale_created();

grant execute on function public.create_notification_if_enabled(uuid, text, text, public.notification_category, public.notification_type, text, text, jsonb, text) to authenticated;
grant execute on function public.sync_notification_automation() to authenticated;
