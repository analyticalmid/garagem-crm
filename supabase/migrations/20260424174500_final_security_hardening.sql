-- Final security hardening: least-privilege directory access,
-- robust tenant resolution, and cleanup of legacy broad policies.

create or replace function public.current_tenant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _tenant_id uuid;
begin
  begin
    select p.tenant_id
      into _tenant_id
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
    limit 1;
  exception
    when others then
      _tenant_id := null;
  end;

  return coalesce(_tenant_id, null);
end;
$$;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Active users can view profiles" on public.profiles;
drop policy if exists "Managers can view tenant profiles" on public.profiles;
drop policy if exists "Users can view own profile and managers tenant" on public.profiles;

create policy "Users can view own profile and managers tenant"
on public.profiles
for select
to authenticated
using (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
  and (
    id = auth.uid()
    or public.is_admin_or_gerente(auth.uid())
  )
);

drop policy if exists "Authenticated users can view roles" on public.user_roles;
drop policy if exists "Active users can view roles" on public.user_roles;
drop policy if exists "Admins gerentes view all roles and users view own" on public.user_roles;
drop policy if exists "Users can view own role and managers tenant roles" on public.user_roles;

create policy "Users can view own role and managers tenant roles"
on public.user_roles
for select
to authenticated
using (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
  and (
    user_id = auth.uid()
    or public.is_admin_or_gerente(auth.uid())
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

drop policy if exists "Allow public read on lead_status" on public.lead_status;
drop policy if exists "Allow public insert on lead_status" on public.lead_status;
drop policy if exists "Allow public update on lead_status" on public.lead_status;
drop policy if exists "Insert lead_status for authenticated" on public.lead_status;
drop policy if exists "Authenticated users can view contacts" on public."Contatos_Whatsapp";
drop policy if exists "Admin and gerente can manage contacts" on public."Contatos_Whatsapp";
drop policy if exists "Authenticated users can view vehicles" on public.estoque_carros;
drop policy if exists "Admin and gerente can update vehicles" on public.estoque_carros;
drop policy if exists "Admin can insert vehicles" on public.estoque_carros;
drop policy if exists "Admin can delete vehicles" on public.estoque_carros;

do $$
begin
  if to_regclass('public.configuracoes_loja') is not null then
    execute 'alter table public.configuracoes_loja enable row level security';
    execute 'alter table public.configuracoes_loja force row level security';
    execute 'drop policy if exists "Allow all operations on configuracoes_loja" on public.configuracoes_loja';
    execute 'drop policy if exists "Tenant isolation guard" on public.configuracoes_loja';
    execute $policy$
      create policy "Tenant isolation guard"
      on public.configuracoes_loja
      as restrictive
      for all
      to authenticated
      using (tenant_id = public.current_tenant_id())
      with check (tenant_id = public.current_tenant_id())
    $policy$;
  end if;
end $$;
