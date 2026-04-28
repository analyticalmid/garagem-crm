-- Pós-venda autônomo e retenção
-- Pode ser executado no SQL Editor do Supabase.

alter table public.vendas
  add column if not exists historico_saude jsonb not null default '[]'::jsonb;

alter table public.pos_venda_cards
  add column if not exists venda_id uuid references public.vendas(id) on delete cascade,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_pos_venda_cards_venda_id
  on public.pos_venda_cards (venda_id);

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
begin
  _novo_evento := jsonb_build_object(
    'data', timezone('utc', now()),
    'tipo_contato', _tipo_contato,
    'observacao', _observacao,
    'canal', _canal,
    'status', _status,
    'metadata', coalesce(_metadata, '{}'::jsonb)
  );

  select coalesce(historico_saude, '[]'::jsonb)
    into _historico_atual
  from public.vendas
  where id = _venda_id;

  if _historico_atual is null then
    raise exception 'Venda % não encontrada.', _venda_id;
  end if;

  _historico_final := _historico_atual || jsonb_build_array(_novo_evento);

  update public.vendas
  set historico_saude = _historico_final,
      updated_at = now()
  where id = _venda_id;

  return _historico_final;
end;
$$;

grant execute on function public.append_historico_saude_venda(uuid, text, text, text, text, jsonb)
  to authenticated, service_role;

drop view if exists public.view_oportunidades_pos_venda;

create view public.view_oportunidades_pos_venda
with (security_invoker = true)
as
select
  v.id as venda_id,
  v.tenant_id as dono_loja_id,
  coalesce(v.comprador_nome, 'Cliente') as nome_cliente,
  v.comprador_nome,
  v.comprador_telefone,
  v.data_venda,
  coalesce(
    nullif(trim(concat_ws(' ', v.marca_veiculo, v.modelo_veiculo)), ''),
    v.nome_veiculo,
    'Veículo'
  ) as veiculo_nome,
  v.modelo_veiculo,
  coalesce(v.historico_saude, '[]'::jsonb) as historico_saude,
  (current_date - v.data_venda::date) as dias_desde_venda,
  case
    when (current_date - v.data_venda::date) = 180 then 'checkup_180'
    when (current_date - v.data_venda::date) = 365 then 'upgrade_365'
    else null
  end as oportunidade_kind,
  case
    when (current_date - v.data_venda::date) = 180 then '🕒 6 Meses: Check-up'
    when (current_date - v.data_venda::date) = 365 then '🔥 1 Ano: Oferta de Troca'
    else null
  end as oportunidade_label,
  case
    when (current_date - v.data_venda::date) = 180 then 'followup_satisfacao'
    when (current_date - v.data_venda::date) = 365 then 'oferta_recompra'
    else null
  end as suggested_column_id,
  case
    when (current_date - v.data_venda::date) = 180 then '6 meses'
    when (current_date - v.data_venda::date) = 365 then '1 ano'
    else null
  end as prazo_label,
  case
    when (current_date - v.data_venda::date) = 180 then
      format(
        'Olá, %s. Seu %s está entrando na janela ideal de 6 meses para um check-up preventivo. Posso te enviar as opções de agenda?',
        coalesce(v.comprador_nome, 'cliente'),
        coalesce(nullif(trim(concat_ws(' ', v.marca_veiculo, v.modelo_veiculo)), ''), v.nome_veiculo, 'veículo')
      )
    when (current_date - v.data_venda::date) = 365 then
      format(
        'Olá, %s. Seu %s completou 1 ano com a gente e preparei uma condição especial de troca para você avaliar sem compromisso.',
        coalesce(v.comprador_nome, 'cliente'),
        coalesce(nullif(trim(concat_ws(' ', v.marca_veiculo, v.modelo_veiculo)), ''), v.nome_veiculo, 'veículo')
      )
    else null
  end as mensagem_sugerida
from public.vendas v
where v.data_venda is not null
  and v.comprador_telefone is not null
  and (current_date - v.data_venda::date) in (180, 365);

grant select on public.view_oportunidades_pos_venda to authenticated, service_role;

drop policy if exists "Post-sale owner can view sales" on public.vendas;
create policy "Post-sale owner can view sales"
on public.vendas
for select
to authenticated
using (
  public.is_active_user(auth.uid())
  and tenant_id = public.current_tenant_id()
);
