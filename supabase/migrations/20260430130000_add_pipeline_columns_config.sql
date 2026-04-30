create table if not exists public.pipeline_columns_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade default public.current_tenant_id(),
  pipeline_key text not null check (pipeline_key in ('leads', 'prevenda')),
  column_key text not null,
  title text not null,
  position integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  color text not null default '#3B82F6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pipeline_columns_config_tenant_pipeline_key_unique unique (tenant_id, pipeline_key, column_key)
);

create index if not exists idx_pipeline_columns_config_pipeline
  on public.pipeline_columns_config (tenant_id, pipeline_key, position);

create trigger update_pipeline_columns_config_updated_at
  before update on public.pipeline_columns_config
  for each row
  execute function public.set_updated_at();

alter table public.pipeline_columns_config enable row level security;
alter table public.pipeline_columns_config force row level security;

drop policy if exists "Tenant isolation guard" on public.pipeline_columns_config;
create policy "Tenant isolation guard"
on public.pipeline_columns_config as restrictive for all
to authenticated
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "Active users can view pipeline columns"
on public.pipeline_columns_config for select
to authenticated
using (
  public.is_active_user(auth.uid())
);

create policy "Active managers can insert pipeline columns"
on public.pipeline_columns_config for insert
to authenticated
with check (
  public.is_active_user(auth.uid())
  and public.is_admin_or_gerente(auth.uid())
);

create policy "Active managers can update pipeline columns"
on public.pipeline_columns_config for update
to authenticated
using (
  public.is_active_user(auth.uid())
  and public.is_admin_or_gerente(auth.uid())
)
with check (
  public.is_active_user(auth.uid())
  and public.is_admin_or_gerente(auth.uid())
);

create policy "Active managers can delete pipeline columns"
on public.pipeline_columns_config for delete
to authenticated
using (
  public.is_active_user(auth.uid())
  and public.is_admin_or_gerente(auth.uid())
);

alter table public.lead_status
  drop constraint if exists lead_status_status_check;
