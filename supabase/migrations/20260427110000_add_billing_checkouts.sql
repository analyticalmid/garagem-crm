create table if not exists public.billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_session_id text not null unique,
  stripe_payment_link_id text null,
  stripe_payment_link_url text null,
  stripe_customer_id text null,
  stripe_payment_intent_id text null,
  payment_status text not null default 'paid',
  plan_type public.plan_type not null,
  customer_name text null,
  customer_email text not null,
  customer_phone text null,
  tenant_id uuid null references public.tenants(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  password_email_sent_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkouts_payment_status_check
    check (payment_status in ('paid', 'unpaid', 'no_payment_required'))
);

create index if not exists billing_checkouts_customer_email_idx
  on public.billing_checkouts (customer_email);

create index if not exists billing_checkouts_tenant_id_idx
  on public.billing_checkouts (tenant_id);

create index if not exists billing_checkouts_user_id_idx
  on public.billing_checkouts (user_id);

create index if not exists billing_checkouts_created_at_idx
  on public.billing_checkouts (created_at desc);

alter table public.billing_checkouts enable row level security;
alter table public.billing_checkouts force row level security;

drop policy if exists "Managers can view tenant billing checkouts" on public.billing_checkouts;
create policy "Managers can view tenant billing checkouts"
on public.billing_checkouts
for select
to authenticated
using (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
  and public.is_admin_or_gerente(auth.uid())
);

drop policy if exists "Users can view own billing checkout" on public.billing_checkouts;
create policy "Users can view own billing checkout"
on public.billing_checkouts
for select
to authenticated
using (
  public.is_active_user(auth.uid())
  and user_id = auth.uid()
);

drop trigger if exists set_billing_checkouts_updated_at on public.billing_checkouts;
create trigger set_billing_checkouts_updated_at
before update on public.billing_checkouts
for each row
execute function public.set_updated_at();
