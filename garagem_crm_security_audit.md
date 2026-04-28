# Auditoria Ofensiva de Segurança — Garagem CRM

Data da auditoria: 24 de abril de 2026  
Escopo auditado: repositório local (`Supabase/Postgres + RLS`, `React/Next/Vite`, `Edge Function`, integrações WhatsApp/Z-API, evidências indiretas de n8n)

## Resumo Executivo

Esta auditoria encontrou falhas reais e exploráveis na superfície serverless do projeto. Os achados mais graves concentram-se em:

- execução externa privilegiada da Edge Function de pós-venda quando o segredo não está configurado;
- quebra de multi-tenancy em `mensagens_whatsapp`;
- uso de `SECURITY DEFINER` com `GRANT EXECUTE TO authenticated` sem validação de tenant/role;
- exposição indevida de PII de clientes e diretório interno de usuários.

Importante: esta análise foi feita por inspeção de código e migrations versionadas no repositório. Não houve acesso ao catálogo vivo do Supabase nem aos workflows n8n hospedados fora do repo. Onde faltam artefatos operacionais, isso está indicado como limitação de auditoria.

## Legenda de Risco

- 🔴 `[MUITO CRÍTICO]` risco de perda total de dados, execução administrativa externa ou comprometimento amplo.
- 🟠 `[CRÍTICO]` quebra de multi-tenancy, acesso lateral entre clientes ou bypass sério de isolamento.
- 🟡 `[ALTO]` exposição de PII, enumeração sensível ou ampliação indevida de privilégios internos.
- 🔵 `[MÉDIO]` falha de lógica, enumeração indireta ou abuso operacional relevante.
- ⚪ `[BAIXO]` lacuna de governança, hardening ou melhoria de boas práticas.

---

## 1. Edge Function de pós-venda executa sem autenticação se o segredo não existir

**Título da Vulnerabilidade**  
`auto-pos-venda` aceita requests não autenticados quando `AUTO_POS_VENDA_SECRET` não está configurado

**Classificação de Risco**  
`🔴 [MUITO CRÍTICO]`

**Status**  
Feito✅

**Descrição Técnica**  
Na Edge Function [`supabase/functions/auto-pos-venda/index.ts:24`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/functions/auto-pos-venda/index.ts:24), a função `isAuthorized()` retorna `true` quando `AUTO_POS_VENDA_SECRET` está vazio:

- [`supabase/functions/auto-pos-venda/index.ts:18`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/functions/auto-pos-venda/index.ts:18)
- [`supabase/functions/auto-pos-venda/index.ts:24`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/functions/auto-pos-venda/index.ts:24)
- [`supabase/functions/auto-pos-venda/index.ts:25`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/functions/auto-pos-venda/index.ts:25)

A mesma função instancia o Supabase com `SUPABASE_SERVICE_ROLE_KEY`:

- [`supabase/functions/auto-pos-venda/index.ts:14`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/functions/auto-pos-venda/index.ts:14)
- [`supabase/functions/auto-pos-venda/index.ts:20`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/functions/auto-pos-venda/index.ts:20)

Na prática, qualquer origem externa pode disparar uma rotina privilegiada que:

- lê oportunidades de pós-venda;
- envia mensagens via Z-API;
- grava histórico em vendas;
- altera status de `pos_venda_cards`.

Isso é equivalente a expor uma automação administrativa para a internet.

**Exemplo de Exploração (Proof of Concept conceitual)**  
1. O atacante descobre a URL pública da Edge Function.  
2. Envia `POST` sem `Authorization` e sem `x-cron-secret`.  
3. Se a variável `AUTO_POS_VENDA_SECRET` estiver ausente no ambiente, a execução prossegue.  
4. A rotina usa `service_role` e aciona ações privilegiadas em lote.

**Recomendação de Correção (Código)**  
Falhar por padrão quando o segredo não estiver definido.

```ts
function isAuthorized(request: Request) {
  if (!cronSecret) {
    throw new Error("AUTO_POS_VENDA_SECRET is required in production");
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret");
  return bearer === cronSecret && headerSecret === cronSecret;
}
```

Também recomendo:

- restringir a invocação a um único header obrigatório;
- registrar e bloquear chamadas sem segredo;
- separar a função em endpoint interno ou Vercel Cron autenticado;
- nunca permitir “open by misconfiguration”.

---

## 2. `mensagens_whatsapp` não tem isolamento por tenant nem por ownership

**Título da Vulnerabilidade**  
Tabela de mensagens WhatsApp acessível a qualquer usuário ativo autenticado

**Classificação de Risco**  
`🟠 [CRÍTICO]`

**Status**  
Feito✅

**Descrição Técnica**  
As policies atuais de `mensagens_whatsapp` só validam `public.is_active_user(auth.uid())`, sem `tenant_id`, sem relacionamento com conversa e sem vínculo com responsável:

- [`supabase/migrations/20260420123000_enable_whatsapp_messages_access.sql:4`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260420123000_enable_whatsapp_messages_access.sql:4)
- [`supabase/migrations/20260420123000_enable_whatsapp_messages_access.sql:12`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260420123000_enable_whatsapp_messages_access.sql:12)
- [`supabase/migrations/20260420123000_enable_whatsapp_messages_access.sql:20`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260420123000_enable_whatsapp_messages_access.sql:20)

O BFF reforça o problema:

- busca todas as mensagens em [`src/app/api/data/route.ts:742`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:742);
- permite leitura por telefone arbitrário em [`src/app/api/data/route.ts:804`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:804);
- permite inserção arbitrária em [`src/app/api/data/route.ts:1029`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:1029);
- permite update de `nome_lead` por telefone em [`src/app/api/data/route.ts:1188`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:1188).

Consequências:

- quebra de multi-tenancy;
- vazamento de conversas e telefones de outros clientes;
- adulteração do histórico de mensagens;
- base pronta para engenharia social, fraude e LGPD incidente.

**Exemplo de Exploração (Proof of Concept conceitual)**  
1. Um vendedor autenticado obtém um JWT legítimo do próprio tenant.  
2. Faz `GET /api/data?op=whatsapp-messages&telefone=<telefone_de_outro_cliente>`.  
3. Recebe o histórico se houver mensagens nesse número, mesmo que não seja responsável e mesmo que pertença a outra loja.  
4. Em seguida faz `POST /api/data?op=whatsapp-send-message` para inserir mensagens falsas no histórico.

**Recomendação de Correção (Código)**  
Adicionar `tenant_id` na tabela e reescrever o modelo de acesso com vínculo a conversa/lead.

```sql
alter table public.mensagens_whatsapp
  add column if not exists tenant_id uuid references public.tenants(id) not null default public.current_tenant_id();

alter table public.mensagens_whatsapp force row level security;

drop policy if exists "Active users can view mensagens_whatsapp" on public.mensagens_whatsapp;
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
      where ls.telefone = mensagens_whatsapp.telefone_id
        and ls.tenant_id = public.current_tenant_id()
        and ls.assigned_to = auth.uid()
    )
  )
);
```

No BFF, pare de fazer `select("*")` global e exija escopo por conversa/lead antes de consultar mensagens.

---

## 3. RPC `append_historico_saude_venda` contorna RLS para qualquer usuário autenticado

**Título da Vulnerabilidade**  
Função `SECURITY DEFINER` com `GRANT EXECUTE TO authenticated` sem validação de tenant, role ou ownership

**Classificação de Risco**  
`🟠 [CRÍTICO]`

**Status**  
Feito✅

**Descrição Técnica**  
A função abaixo é `SECURITY DEFINER` e grava diretamente em `public.vendas`:

- [`supabase/migrations/20260422103000_pos_venda_retencao.sql:14`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260422103000_pos_venda_retencao.sql:14)
- [`supabase/migrations/20260422103000_pos_venda_retencao.sql:24`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260422103000_pos_venda_retencao.sql:24)
- [`supabase/migrations/20260422103000_pos_venda_retencao.sql:61`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260422103000_pos_venda_retencao.sql:61)

Ela não valida:

- `auth.uid()`;
- `tenant_id`;
- papel do usuário;
- ownership da venda.

Como `EXECUTE` foi concedido para `authenticated`, qualquer usuário autenticado pode chamar a RPC diretamente pela API do Supabase e injetar eventos arbitrários em `historico_saude`, desde que conheça um `venda_id`.

Isso é bypass clássico de RLS via função privilegiada.

**Exemplo de Exploração (Proof of Concept conceitual)**  
1. Usuário autenticado chama `rpc/append_historico_saude_venda` com um `uuid` de venda conhecido.  
2. A função ignora tenant e role do caller.  
3. O histórico da venda é adulterado com eventos falsos como “contato realizado”, “enviado” etc.  
4. A trilha operacional vira evidência falsa.

**Recomendação de Correção (Código)**  
Remover o grant amplo e validar tenant/role dentro da função.

```sql
revoke execute on function public.append_historico_saude_venda(uuid, text, text, text, text, jsonb) from authenticated;
grant execute on function public.append_historico_saude_venda(uuid, text, text, text, text, jsonb) to service_role;

create or replace function public.append_historico_saude_venda(...)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _tenant_id uuid;
begin
  select tenant_id into _tenant_id
  from public.vendas
  where id = _venda_id;

  if _tenant_id is null or _tenant_id <> public.current_tenant_id() then
    raise exception 'forbidden';
  end if;

  if not public.is_admin_or_gerente(auth.uid()) then
    raise exception 'forbidden';
  end if;

  -- restante da lógica
end;
$$;
```

Se a função é só para automação server-side, `service_role` deve ser o único executor.

---

## 4. Política de vendas expõe PII de compradores para qualquer usuário ativo do tenant

**Título da Vulnerabilidade**  
Leitura ampla de `vendas` e `view_oportunidades_pos_venda` sem necessidade de privilégio comercial específico

**Classificação de Risco**  
`🟡 [ALTO]`

**Status**  
Feito✅

**Descrição Técnica**  
O hardening antigo já era permissivo:

- [`supabase/migrations/20260403120000_harden_security_policies.sql:259`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260403120000_harden_security_policies.sql:259)

Depois, a migration de pós-venda consolidou uma policy ainda mais ampla para `SELECT` em `vendas`:

- [`supabase/migrations/20260422103000_pos_venda_retencao.sql:126`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260422103000_pos_venda_retencao.sql:126)

Essa policy permite que qualquer usuário ativo do tenant leia todas as vendas do tenant. O endpoint `sales-page` devolve PII diretamente:

- [`src/app/api/data/route.ts:704`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:704)
- [`src/app/api/data/route.ts:711`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:711)

E o endpoint de oportunidades de pós-venda expõe novamente nome e telefone do comprador:

- [`src/app/api/data/route.ts:679`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:679)
- [`supabase/migrations/20260422103000_pos_venda_retencao.sql:72`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260422103000_pos_venda_retencao.sql:72)
- [`supabase/migrations/20260422103000_pos_venda_retencao.sql:74`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260422103000_pos_venda_retencao.sql:74)

Isso não quebra tenant, mas quebra mínimo privilégio e expõe PII LGPD internamente.

**Exemplo de Exploração (Proof of Concept conceitual)**  
1. Um usuário ativo comum acessa a API com seu JWT.  
2. Chama `GET /api/data?op=sales-page` ou `GET /api/data?op=pos-venda-oportunidades`.  
3. Obtém nomes, telefones, valores de venda e observações de compradores que não deveria acessar.

**Recomendação de Correção (Código)**  
Restringir `SELECT` de vendas por role ou ownership.

```sql
drop policy if exists "Post-sale owner can view sales" on public.vendas;

create policy "Scoped users can view sales"
on public.vendas
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.is_active_user(auth.uid())
  and (
    public.is_admin_or_gerente(auth.uid())
    or vendedor_id = auth.uid()
  )
);
```

No BFF, aplique validação explícita antes de devolver PII:

```ts
if (!session.isManager && session.role !== "vendedor") {
  return jsonError("Forbidden", 403);
}
```

---

## 5. Endpoint `users` expõe diretório completo de perfis, cargos, tenant e plano para qualquer autenticado

**Título da Vulnerabilidade**  
Enumeração interna de usuários no BFF sem controle server-side por perfil administrativo

**Classificação de Risco**  
`🟡 [ALTO]`

**Status**  
Feito✅

**Descrição Técnica**  
O endpoint `GET /api/data?op=users` não exige `admin` nem `gerente`:

- [`src/app/api/data/route.ts:571`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:571)

Ele busca `profiles.*` e `user_roles.*`:

- [`src/app/api/data/route.ts:574`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:574)
- [`src/app/api/data/route.ts:575`](/Users/matheusguimaraes/Downloads/garage-crm/src/app/api/data/route.ts:575)

As policies finais permitem que qualquer usuário ativo visualize perfis e roles:

- [`supabase/migrations/20260403120000_harden_security_policies.sql:78`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260403120000_harden_security_policies.sql:78)
- [`supabase/migrations/20260403120000_harden_security_policies.sql:105`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260403120000_harden_security_policies.sql:105)

O resultado é que qualquer autenticado do tenant consegue enumerar:

- e-mails internos;
- telefones;
- `tenant_id`;
- `plan_type`;
- status ativo/inativo;
- papel de cada colaborador.

**Exemplo de Exploração (Proof of Concept conceitual)**  
1. Usuário comum abre DevTools ou usa `curl` com seu JWT.  
2. Chama `GET /api/data?op=users`.  
3. Recebe o diretório completo da equipe, inclusive metadados administrativos.

**Recomendação de Correção (Código)**  
Aplicar bloqueio no BFF e reduzir o escopo do `select`.

```ts
case "users": {
  if (!session.isManager && !session.isAdmin) {
    return jsonError("Forbidden", 403);
  }

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, is_active, plan_type"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
}
```

Se a listagem não for necessária para usuários comuns, a policy de `SELECT` em `profiles` e `user_roles` também deve ser endurecida.

---

## 6. RPCs de plano permitem enumeração de tenant externo

**Título da Vulnerabilidade**  
`tenant_plan_type()` e `validate_tenant_user_limit()` aceitam `tenant_id` arbitrário com `SECURITY DEFINER`

**Classificação de Risco**  
`🔵 [MÉDIO]`

**Status**  
Feito✅

**Descrição Técnica**  
As funções abaixo são `SECURITY DEFINER` e receberam `GRANT EXECUTE TO authenticated`:

- [`supabase/migrations/20260424120000_add_plan_system_and_invitations.sql:53`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260424120000_add_plan_system_and_invitations.sql:53)
- [`supabase/migrations/20260424120000_add_plan_system_and_invitations.sql:95`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260424120000_add_plan_system_and_invitations.sql:95)
- [`supabase/migrations/20260424120000_add_plan_system_and_invitations.sql:270`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260424120000_add_plan_system_and_invitations.sql:270)
- [`supabase/migrations/20260424120000_add_plan_system_and_invitations.sql:272`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260424120000_add_plan_system_and_invitations.sql:272)

Como elas aceitam `_tenant_id` arbitrário e não comparam com `public.current_tenant_id()`, qualquer autenticado pode consultar:

- qual plano outro tenant usa (`pro` ou `essencial`);
- se o tenant alvo já bateu o limite de usuários.

Isso é enumeração lateral entre clientes.

**Exemplo de Exploração (Proof of Concept conceitual)**  
1. Usuário autenticado obtém ou chuta UUIDs de `tenant_id`.  
2. Chama `rpc/tenant_plan_type` e `rpc/validate_tenant_user_limit`.  
3. Constrói inteligência comercial e operacional sobre outros tenants.

**Recomendação de Correção (Código)**  
Amarrar o parâmetro ao tenant corrente.

```sql
create or replace function public.validate_tenant_user_limit(_tenant_id uuid default public.current_tenant_id())
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if _tenant_id is distinct from public.current_tenant_id() then
    raise exception 'forbidden';
  end if;

  -- restante da lógica
end;
$$;

revoke execute on function public.tenant_plan_type(uuid) from authenticated;
```

Se a função serve apenas ao backend, mova o uso para `service_role`.

---

## 7. Gap de governança: fluxos n8n não estão versionados e não são auditáveis neste repositório

**Título da Vulnerabilidade**  
Webhooks n8n não auditáveis por ausência de workflows/headers/versionamento no código

**Classificação de Risco**  
`⚪ [BAIXO]`

**Status**  
Feito✅

**Descrição Técnica**  
O repositório contém evidência indireta de n8n no schema (`n8n_chat_histories` no tipo gerado), mas não contém:

- workflows n8n exportados;
- handlers HTTP do n8n;
- documentação de validação de origem;
- segredo de webhook versionado em IaC.

Na prática, não é possível confirmar se os webhooks n8n validam:

- `Authorization`;
- `x-api-key`;
- HMAC;
- allowlist de origem.

Em ambientes serverless, ausência de versionamento do fluxo de automação vira risco operacional: a segurança existe “fora do código” e não é auditável.

**Exemplo de Exploração (Proof of Concept conceitual)**  
1. Um webhook n8n externo é publicado sem header secreto ou com segredo fraco.  
2. O atacante dispara payloads falsos ou replays.  
3. O CRM processa automações sem trilha reproduzível no repositório.

**Recomendação de Correção (Código)**  
Versionar os fluxos n8n ou substituir endpoints críticos por handlers próprios versionados.

```md
- Exportar workflows n8n para JSON no repositório
- Padronizar validação HMAC ou Bearer obrigatório
- Documentar secrets e rotação em IaC
- Negar execução se header de autenticação não existir
```

---

## Notas Complementares

- Não encontrei `SUPABASE_SERVICE_ROLE_KEY` exposta em `VITE_*`, `NEXT_PUBLIC_*` ou `.env.example`.
- O `.env` local contém apenas chaves públicas do Supabase e está ignorado no `.gitignore`.
- Não encontrei um sink concreto de XSS armazenado no frontend auditado. Os inputs analisados são renderizados por React sem `dangerouslySetInnerHTML` com dados do usuário. O único `dangerouslySetInnerHTML` encontrado está em [`src/components/ui/chart.tsx:70`](/Users/matheusguimaraes/Downloads/garage-crm/src/components/ui/chart.tsx:70) e consome configuração estática de tema, não conteúdo vindo de lead/veículo/mensagem.
- A rota de edição de veículos não configurou um IDOR óbvio: o `UPDATE` em `estoque_carros` está restrito para admin/gerente nas policies finais:
  - [`supabase/migrations/20260403120000_harden_security_policies.sql:226`](/Users/matheusguimaraes/Downloads/garage-crm/supabase/migrations/20260403120000_harden_security_policies.sql:226)

## Prioridade de Correção

1. Fechar imediatamente a Edge Function `auto-pos-venda` com fail-closed.  
2. Corrigir `mensagens_whatsapp` com `tenant_id` + policies por responsável.  
3. Revogar `EXECUTE` amplo de `append_historico_saude_venda`.  
4. Restringir `SELECT` de `vendas` e `view_oportunidades_pos_venda`.  
5. Colocar autorização server-side explícita no endpoint `users`.  
6. Endurecer RPCs de plano para impedir enumeração lateral.  
7. Versionar e autenticar formalmente os webhooks n8n.
