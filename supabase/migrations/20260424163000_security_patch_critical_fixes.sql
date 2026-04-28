-- Security patch: fail-closed plan RPCs, tenant-scoped WhatsApp messages,
-- restricted sales reads, and hardened SECURITY DEFINER routines.

do $$
begin
  if to_regclass('public.mensagens_whatsapp') is not null then
    alter table public.mensagens_whatsapp
      add column if not exists tenant_id uuid references public.tenants(id);

    update public.mensagens_whatsapp
    set tenant_id = coalesce(
      tenant_id,
      '00000000-0000-0000-0000-000000000001'::uuid
    )
    where tenant_id is null;

    alter table public.mensagens_whatsapp
      alter column tenant_id set default public.current_tenant_id();

    alter table public.mensagens_whatsapp
      alter column tenant_id set not null;

    create index if not exists idx_mensagens_whatsapp_tenant_phone
      on public.mensagens_whatsapp (tenant_id, telefone_id);

    alter table public.mensagens_whatsapp enable row level security;
    alter table public.mensagens_whatsapp force row level security;
  end if;
end $$;

drop policy if exists "Active users can view mensagens_whatsapp" on public.mensagens_whatsapp;
drop policy if exists "Active users can insert mensagens_whatsapp" on public.mensagens_whatsapp;
drop policy if exists "Active users can update mensagens_whatsapp" on public.mensagens_whatsapp;
drop policy if exists "Scoped users can view mensagens_whatsapp" on public.mensagens_whatsapp;
drop policy if exists "Scoped users can insert mensagens_whatsapp" on public.mensagens_whatsapp;
drop policy if exists "Scoped users can update mensagens_whatsapp" on public.mensagens_whatsapp;

create policy "Scoped users can view mensagens_whatsapp"
on public.mensagens_whatsapp
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.is_active_user(auth.uid())
  and (
    public.is_admin_or_gerente(auth.uid())
    or exists (
      select 1
      from public.lead_status ls
      where ls.telefone = public.mensagens_whatsapp.telefone_id
        and ls.tenant_id = public.current_tenant_id()
        and ls.assigned_to = auth.uid()
    )
  )
);

create policy "Scoped users can insert mensagens_whatsapp"
on public.mensagens_whatsapp
for insert
to authenticated
with check (
  tenant_id = public.current_tenant_id()
  and public.is_active_user(auth.uid())
  and (
    public.is_admin_or_gerente(auth.uid())
    or exists (
      select 1
      from public.lead_status ls
      where ls.telefone = public.mensagens_whatsapp.telefone_id
        and ls.tenant_id = public.current_tenant_id()
        and ls.assigned_to = auth.uid()
    )
  )
);

create policy "Scoped users can update mensagens_whatsapp"
on public.mensagens_whatsapp
for update
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.is_active_user(auth.uid())
  and (
    public.is_admin_or_gerente(auth.uid())
    or exists (
      select 1
      from public.lead_status ls
      where ls.telefone = public.mensagens_whatsapp.telefone_id
        and ls.tenant_id = public.current_tenant_id()
        and ls.assigned_to = auth.uid()
    )
  )
)
with check (
  tenant_id = public.current_tenant_id()
  and public.is_active_user(auth.uid())
  and (
    public.is_admin_or_gerente(auth.uid())
    or exists (
      select 1
      from public.lead_status ls
      where ls.telefone = public.mensagens_whatsapp.telefone_id
        and ls.tenant_id = public.current_tenant_id()
        and ls.assigned_to = auth.uid()
    )
  )
);

create or replace function public.tenant_plan_type(_tenant_id uuid default public.current_tenant_id())
returns public.plan_type
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _effective_tenant_id uuid;
  _caller_role text := auth.role();
begin
  if _caller_role = 'authenticated' then
    _effective_tenant_id := public.current_tenant_id();

    if _effective_tenant_id is null then
      return 'pro'::public.plan_type;
    end if;

    if _tenant_id is not null and _tenant_id <> _effective_tenant_id then
      raise exception 'forbidden';
    end if;
  else
    _effective_tenant_id := coalesce(_tenant_id, public.current_tenant_id());
  end if;

  if _effective_tenant_id is null then
    return 'pro'::public.plan_type;
  end if;

  return coalesce(
    (
      select p.plan_type
      from public.profiles p
      join public.user_roles ur
        on ur.user_id = p.id
       and ur.tenant_id = p.tenant_id
      where p.tenant_id = _effective_tenant_id
        and p.is_active = true
        and ur.role in ('admin', 'gerente')
      order by case p.plan_type when 'essencial' then 0 else 1 end
      limit 1
    ),
    (
      select p.plan_type
      from public.profiles p
      where p.tenant_id = _effective_tenant_id
      order by case p.plan_type when 'essencial' then 0 else 1 end
      limit 1
    ),
    'pro'::public.plan_type
  );
end;
$$;

create or replace function public.validate_tenant_user_limit(_tenant_id uuid default public.current_tenant_id())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _effective_tenant_id uuid;
  _caller_role text := auth.role();
  _plan public.plan_type;
  _limit integer;
  _used integer;
begin
  if _caller_role = 'authenticated' then
    _effective_tenant_id := public.current_tenant_id();

    if _effective_tenant_id is null then
      return false;
    end if;

    if _tenant_id is not null and _tenant_id <> _effective_tenant_id then
      raise exception 'forbidden';
    end if;
  else
    _effective_tenant_id := coalesce(_tenant_id, public.current_tenant_id());
  end if;

  if _effective_tenant_id is null then
    return false;
  end if;

  _plan := public.tenant_plan_type(_effective_tenant_id);
  _limit := public.plan_user_limit(_plan);

  select
    (
      select count(*)::integer
      from public.profiles p
      where p.tenant_id = _effective_tenant_id
        and p.is_active = true
    ) +
    (
      select count(*)::integer
      from public.invitations i
      where i.tenant_id = _effective_tenant_id
        and i.status = 'pending'
    )
  into _used;

  return _used < _limit;
end;
$$;

revoke execute on function public.append_historico_saude_venda(uuid, text, text, text, text, jsonb) from public;
revoke execute on function public.append_historico_saude_venda(uuid, text, text, text, text, jsonb) from anon;
revoke execute on function public.append_historico_saude_venda(uuid, text, text, text, text, jsonb) from authenticated;
grant execute on function public.append_historico_saude_venda(uuid, text, text, text, text, jsonb) to service_role;

create or replace function public.append_historico_saude_venda(
  _venda_id uuid,
  _tipo_contato text,
  _observacao text,
  _canal text default 'whatsapp',
  _status text default 'enviado',
  _metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _novo_evento jsonb;
  _historico_atual jsonb;
  _historico_final jsonb;
  _tenant_id uuid;
  _caller_id uuid := auth.uid();
  _caller_role text := auth.role();
begin
  select v.tenant_id, coalesce(v.historico_saude, '[]'::jsonb)
    into _tenant_id, _historico_atual
  from public.vendas v
  where v.id = _venda_id;

  if _tenant_id is null then
    raise exception 'Venda % não encontrada.', _venda_id;
  end if;

  if _caller_role is distinct from 'service_role' then
    if _caller_id is null then
      raise exception 'unauthorized';
    end if;

    if not public.is_active_user(_caller_id) then
      raise exception 'forbidden';
    end if;

    if _tenant_id <> public.current_tenant_id() then
      raise exception 'forbidden';
    end if;

    if not public.is_admin_or_gerente(_caller_id) then
      raise exception 'forbidden';
    end if;
  end if;

  _novo_evento := jsonb_build_object(
    'data', timezone('utc', now()),
    'tipo_contato', _tipo_contato,
    'observacao', _observacao,
    'canal', _canal,
    'status', _status,
    'metadata', coalesce(_metadata, '{}'::jsonb)
  );

  _historico_final := _historico_atual || jsonb_build_array(_novo_evento);

  update public.vendas
  set historico_saude = _historico_final,
      updated_at = now()
  where id = _venda_id
    and tenant_id = _tenant_id;

  return _historico_final;
end;
$$;

drop policy if exists "Active users can view sales" on public.vendas;
drop policy if exists "Sales visible by team scope" on public.vendas;
drop policy if exists "Post-sale owner can view sales" on public.vendas;
drop policy if exists "Scoped tenant users can view sales" on public.vendas;

create policy "Scoped tenant users can view sales"
on public.vendas
for select
to authenticated
using (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
  and (
    public.is_admin_or_gerente(auth.uid())
    or vendedor_id = auth.uid()
  )
);
