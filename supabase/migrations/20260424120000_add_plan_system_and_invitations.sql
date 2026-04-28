-- Planos, convites e guards de acesso por plano.

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'plan_type'
  ) then
    create type public.plan_type as enum ('pro', 'essencial');
  end if;
end $$;

alter table public.profiles
  add column if not exists tenant_id uuid references public.tenants(id)
    default '00000000-0000-0000-0000-000000000001' not null,
  add column if not exists plan_type public.plan_type not null default 'pro';

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.app_role not null default 'vendedor',
  created_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz null,
  constraint invitations_status_check check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  constraint invitations_email_not_blank check (length(trim(email)) > 3)
);

create index if not exists invitations_tenant_status_idx
  on public.invitations (tenant_id, status, created_at desc);

create unique index if not exists invitations_pending_email_tenant_idx
  on public.invitations (lower(email), tenant_id)
  where status = 'pending';

alter table public.invitations enable row level security;

create or replace function public.current_plan_type()
returns public.plan_type
language sql
stable
security definer
set search_path = public
as $$
  select p.plan_type
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.tenant_plan_type(_tenant_id uuid)
returns public.plan_type
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.plan_type
      from public.profiles p
      join public.user_roles ur
        on ur.user_id = p.id
       and ur.tenant_id = p.tenant_id
      where p.tenant_id = _tenant_id
        and p.is_active = true
        and ur.role in ('admin', 'gerente')
      order by case p.plan_type when 'essencial' then 0 else 1 end
      limit 1
    ),
    (
      select p.plan_type
      from public.profiles p
      where p.tenant_id = _tenant_id
      order by case p.plan_type when 'essencial' then 0 else 1 end
      limit 1
    ),
    'pro'::public.plan_type
  )
$$;

create or replace function public.plan_user_limit(_plan public.plan_type)
returns integer
language sql
immutable
as $$
  select case _plan
    when 'essencial' then 3
    else 1
  end
$$;

create or replace function public.validate_tenant_user_limit(_tenant_id uuid default public.current_tenant_id())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _plan public.plan_type;
  _limit integer;
  _used integer;
begin
  if _tenant_id is null then
    return false;
  end if;

  _plan := public.tenant_plan_type(_tenant_id);
  _limit := public.plan_user_limit(_plan);

  select
    (
      select count(*)::integer
      from public.profiles p
      where p.tenant_id = _tenant_id
        and p.is_active = true
    ) +
    (
      select count(*)::integer
      from public.invitations i
      where i.tenant_id = _tenant_id
        and i.status = 'pending'
    )
  into _used;

  return _used < _limit;
end;
$$;

create or replace function public.can_access_essencial_feature()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_or_gerente(auth.uid())
    or public.current_plan_type() = 'essencial'::public.plan_type
$$;

drop policy if exists "Team can view own invitations" on public.invitations;
create policy "Team can view own invitations"
on public.invitations for select
to authenticated
using (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
  and (
    public.is_admin_or_gerente(auth.uid())
    or created_by = auth.uid()
  )
);

drop policy if exists "Managers can create invitations" on public.invitations;
create policy "Managers can create invitations"
on public.invitations for insert
to authenticated
with check (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
  and created_by = auth.uid()
  and public.current_plan_type() = 'essencial'::public.plan_type
  and public.is_admin_or_gerente(auth.uid())
  and public.validate_tenant_user_limit(tenant_id)
);

drop policy if exists "Managers can update own tenant invitations" on public.invitations;
create policy "Managers can update own tenant invitations"
on public.invitations for update
to authenticated
using (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
  and public.is_admin_or_gerente(auth.uid())
)
with check (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
  and public.is_admin_or_gerente(auth.uid())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _invitation public.invitations%rowtype;
  _tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  _role public.app_role := 'vendedor';
  _plan public.plan_type := 'pro';
begin
  select *
    into _invitation
  from public.invitations
  where lower(email) = lower(NEW.email)
    and status = 'pending'
  order by created_at desc
  limit 1;

  if found then
    _tenant_id := _invitation.tenant_id;
    _role := _invitation.role;
    _plan := public.tenant_plan_type(_invitation.tenant_id);
  end if;

  insert into public.profiles (id, email, full_name, is_active, tenant_id, plan_type)
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    found,
    _tenant_id,
    _plan
  )
  on conflict (id) do update set
    email = excluded.email,
    tenant_id = excluded.tenant_id,
    plan_type = excluded.plan_type,
    updated_at = now();

  insert into public.user_roles (user_id, role, tenant_id)
  values (NEW.id, _role, _tenant_id)
  on conflict do nothing;

  if found then
    update public.invitations
    set status = 'accepted',
        accepted_at = now()
    where id = _invitation.id;
  end if;

  return NEW;
end;
$$;

drop policy if exists "Plan guard for prevenda_contatos" on public.prevenda_contatos;
create policy "Plan guard for prevenda_contatos"
on public.prevenda_contatos
as restrictive
for all
to authenticated
using (public.can_access_essencial_feature())
with check (public.can_access_essencial_feature());

drop policy if exists "Plan guard for pos_venda_cards" on public.pos_venda_cards;
create policy "Plan guard for pos_venda_cards"
on public.pos_venda_cards
as restrictive
for all
to authenticated
using (public.can_access_essencial_feature())
with check (public.can_access_essencial_feature());

drop policy if exists "Active admin gerente can view margens" on public.margens_veiculos;
drop policy if exists "Plan users can view margens" on public.margens_veiculos;
create policy "Plan users can view margens"
on public.margens_veiculos for select
to authenticated
using (
  public.is_active_user(auth.uid())
  and public.can_access_essencial_feature()
);

grant execute on function public.current_plan_type() to authenticated;
grant execute on function public.tenant_plan_type(uuid) to authenticated;
grant execute on function public.plan_user_limit(public.plan_type) to authenticated;
grant execute on function public.validate_tenant_user_limit(uuid) to authenticated;
