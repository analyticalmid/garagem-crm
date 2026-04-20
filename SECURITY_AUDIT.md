# Security Audit — Garagem CRM
**Data:** 17 de abril de 2026  
**Versão analisada:** branch/commit indisponível; o diretório não contém `.git` (`git rev-parse` falhou). Base analisada: árvore local em `/Users/matheusguimaraes/Downloads/garage-crm-pro-main` em 17/04/2026.  
**Responsável:** Codex / GPT-4

---

## Resumo Executivo

O projeto é um SPA React/Vite integrado diretamente ao Supabase por chave `anon` pública. A auditoria original encontrou 14 achados, sendo 1 🔴 MUITO CRÍTICO, 4 🟠 CRÍTICO, 4 🟡 ALTO, 4 🔵 MÉDIO e 1 ⚪ BAIXO.

Após a remediação, **13 achados estão marcados como Resolvido ✅** no código/migrations do projeto. **1 achado permanece como Pendente 🟡**, pois depende de configuração operacional fora do repositório: rate limiting/controles de abuso no Supabase Auth, API gateway/CDN ou Edge Functions. Além disso, recomenda-se validação funcional final com usuários reais dos perfis `admin`, `gerente` e `vendedor`.

## Tabela de Achados

| # | Status | Severidade | Área | Título resumido |
|---|---|---|---|---|
| 1 | Resolvido ✅ | 🔴 MUITO CRÍTICO | Banco de Dados / Multi-tenant | Não há `tenant_id` nem isolamento multi-tenant em nenhuma camada |
| 2 | Resolvido ✅ | 🟠 CRÍTICO | Banco de Dados / RLS | Migrations não garantem RLS ativo em tabelas pré-existentes sensíveis |
| 3 | Resolvido ✅ | 🟠 CRÍTICO | Banco de Dados / RLS | Registros sem responsável (`NULL`) ficam visíveis para todos os usuários ativos |
| 4 | Resolvido ✅ | 🟠 CRÍTICO | Autorização / RBAC | Roles são globais e sem escopo de tenant/unidade |
| 5 | Resolvido ✅ | 🟠 CRÍTICO | Banco de Dados / RPC | `create_notification_if_enabled` permite notificação arbitrária entre usuários |
| 6 | Resolvido ✅ | 🟡 ALTO | Dados Sensíveis | Margens/custos de veículos são legíveis por qualquer usuário ativo |
| 7 | Resolvido ✅ | 🟡 ALTO | Frontend / Exportação | Rota de exportação disponível para qualquer usuário autenticado |
| 8 | Resolvido ✅ | 🟡 ALTO | Banco de Dados / N8N | `n8n_chat_histories` aparece no schema TypeScript sem RLS/políticas no projeto |
| 9 | Resolvido ✅ | 🟡 ALTO | Dependências | `npm audit` aponta 15 vulnerabilidades, incluindo 9 altas |
| 10 | Resolvido ✅ | 🔵 MÉDIO | Autenticação | Sessão Supabase persiste em `localStorage` sem CSP/hardening contra XSS |
| 11 | Resolvido ✅ | 🔵 MÉDIO | Autorização Frontend | Rotas não usam `requiredRoles`; autorização administrativa depende da UI + RLS |
| 12 | Pendente 🟡 | 🔵 MÉDIO | Rate limiting / Abuso | Ausência de controles locais de rate limiting para login, RPCs e consultas recorrentes |
| 13 | Resolvido ✅ | 🔵 MÉDIO | Tratamento de Erros / Logs | Erros do Supabase são exibidos/logados com detalhes excessivos |
| 14 | Resolvido ✅ | ⚪ BAIXO | Segredos / Configuração | `.env` local versionável contém URL e chave anon pública do Supabase |

## Detalhamento dos Achados

### 1. 🔴 MUITO CRÍTICO — Não há `tenant_id` nem isolamento multi-tenant em nenhuma camada

**Status:** Resolvido ✅

**Correção aplicada**  
Foi adicionada a migration `supabase/migrations/20260417170000_security_audit_remediation.sql`, criando modelo de tenant, funções tenant-aware e políticas restritivas com `tenant_id = public.current_tenant_id()` nas tabelas de negócio.

**Descrição**  
Não foi encontrado `tenant_id`, `organization_id`, `empresa_id`, `loja_id`, `team_id` ou identificador equivalente em código, migrations, hooks, tipos ou queries. As políticas usam apenas `auth.uid()`, roles globais e campos como `assigned_to`, `responsavel_id` ou `vendedor_id`. Isso não implementa isolamento multi-tenant; implementa apenas controle por usuário/responsável dentro de uma mesma base lógica.

**Localização**  
- Busca global sem resultados: `rg "tenant_id|organization_id|org_id|empresa_id|loja_id|team_id|account_id" . -g '!node_modules' -g '!dist' -g '!*.zip'`
- Políticas por responsável: `supabase/migrations/20260403124500_harden_team_read_model.sql:16`, `supabase/migrations/20260403124500_harden_team_read_model.sql:39`, `supabase/migrations/20260403124500_harden_team_read_model.sql:53`, `supabase/migrations/20260403124500_harden_team_read_model.sql:67`
- Queries sem filtro de tenant: `src/hooks/useLeadsKanban.ts:37`, `src/hooks/useLeadsKanban.ts:48`, `src/hooks/useLeadsKanban.ts:55`, `src/pages/Exportar.tsx:69`, `src/pages/Exportar.tsx:78`

**Impacto**  
Se este CRM for usado por mais de uma garagem/empresa/tenant na mesma instância Supabase, usuários podem acessar dados fora do tenant por desenho, especialmente usuários `admin`/`gerente` e qualquer usuário que veja registros não atribuídos. Isso configura vazamento transversal de todos os tenants.

**Recomendação**  
Adicionar `tenant_id` obrigatório em todas as tabelas de negócio, vincular usuários a tenants (`user_tenants` ou `profiles.tenant_id`), criar índice composto por tenant e chave de negócio, e reescrever todas as policies para exigir `tenant_id = current_user_tenant()` além das regras de role/responsável. Nenhuma query do frontend deve depender de filtragem local para tenant.

### 2. 🟠 CRÍTICO — Migrations não garantem RLS ativo em tabelas pré-existentes sensíveis

**Status:** Resolvido ✅

**Correção aplicada**  
A migration `supabase/migrations/20260417170000_security_audit_remediation.sql` habilita RLS e `FORCE ROW LEVEL SECURITY` nas tabelas públicas relevantes. A validação manual no Supabase confirmou `rowsecurity = true` e `forcerowsecurity = true` para as tabelas.

**Descrição**  
As migrations criam políticas para tabelas sensíveis pré-existentes, mas não há `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` para `Contatos_Whatsapp`, `Mensagens_enviadas`, `Memoria_PostgreSQL_Whatsapp` e `estoque_carros`. Em PostgreSQL, criar policy não basta: se RLS não estiver habilitado, a policy não restringe acesso. Como essas tabelas aparecem em `types.ts`, fazem parte do schema usado pelo app.

**Localização**  
- Policies sem `ENABLE ROW LEVEL SECURITY`: `supabase/migrations/20251222204637_2b042463-e94e-4964-9c96-05b27047adf7.sql:2`, `supabase/migrations/20251222204637_2b042463-e94e-4964-9c96-05b27047adf7.sql:17`, `supabase/migrations/20251222204637_2b042463-e94e-4964-9c96-05b27047adf7.sql:24`
- Hardening posterior também só recria policies: `supabase/migrations/20260403120000_harden_security_policies.sql:186`, `supabase/migrations/20260403120000_harden_security_policies.sql:206`, `supabase/migrations/20260403120000_harden_security_policies.sql:211`, `supabase/migrations/20260403120000_harden_security_policies.sql:221`
- Tabelas no schema TypeScript: `src/integrations/supabase/types.ts:42`, `src/integrations/supabase/types.ts:111`, `src/integrations/supabase/types.ts:379`, `src/integrations/supabase/types.ts:400`

**Impacto**  
Se qualquer uma dessas tabelas estiver com RLS desabilitado no banco real, qualquer usuário com role `authenticated` poderá consultar ou modificar dados conforme privilégios PostgREST concedidos, ignorando as policies. Isso pode expor leads WhatsApp, mensagens, memória de IA e estoque.

**Recomendação**  
Adicionar migrations idempotentes com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` para todas as tabelas públicas usadas pelo app e, preferencialmente, `ALTER TABLE ... FORCE ROW LEVEL SECURITY`. Auditar no Supabase com `select schemaname, tablename, rowsecurity from pg_tables where schemaname = 'public';`.

### 3. 🟠 CRÍTICO — Registros sem responsável (`NULL`) ficam visíveis para todos os usuários ativos

**Status:** Resolvido ✅

**Correção aplicada**  
As policies foram endurecidas para remover a visibilidade global de registros `NULL`, mantendo acesso administrativo/gerencial por tenant. No frontend, criações/atualizações passaram a preencher responsável quando necessário em hooks como `useLeadsKanban`, `usePrevendaLeadsKanban` e `useTasks`.

**Descrição**  
Várias policies tratam `assigned_to IS NULL`, `responsavel_id IS NULL` ou `vendedor_id IS NULL` como visíveis para qualquer usuário ativo. Isso cria um “pool global” de dados. Em bases com automações, importações, webhooks ou registros legados sem responsável, qualquer vendedor ativo pode ver leads, tarefas, vendas e cards não atribuídos.

**Localização**  
- Contatos visíveis quando não há `lead_status`: `supabase/migrations/20260403124500_harden_team_read_model.sql:29`
- Pré-venda sem responsável: `supabase/migrations/20260403124500_harden_team_read_model.sql:47`
- Tarefas sem responsável: `supabase/migrations/20260403124500_harden_team_read_model.sql:61`
- Vendas sem vendedor: `supabase/migrations/20260403124500_harden_team_read_model.sql:75`
- Pós-venda sem responsável: `supabase/migrations/20260408153000_create_pos_venda_cards.sql:43`
- Frontend também mantém esse comportamento: `src/hooks/useLeadsKanban.ts:171`, `src/hooks/useLeadsKanban.ts:173`

**Impacto**  
Dados pessoais e comerciais não atribuídos ficam acessíveis para usuários que não deveriam visualizá-los. Isso afeta leads novos, vendas sem vendedor, tarefas manuais sem responsável e cards de pós-venda.

**Recomendação**  
Substituir `IS NULL` por uma fila controlada: `queue_id`, `tenant_id`, `visibility_scope`, ou atribuição automática ao criador/time. Para vendedores, remover visibilidade global de nulos; para admin/gerente, manter apenas dentro do tenant. Criar rotina de saneamento para atribuir registros legados nulos.

### 4. 🟠 CRÍTICO — Roles são globais e sem escopo de tenant/unidade

**Status:** Resolvido ✅

**Correção aplicada**  
As funções de autorização foram substituídas por versões tenant-aware na migration de remediação, incluindo `current_tenant_id`, `tenant_id_for_user`, `has_any_role`, `has_role`, `is_admin_or_gerente` e `get_user_role`.

**Descrição**  
A tabela `user_roles` relaciona apenas `user_id` e `role`, sem tenant/unidade. As funções `has_role` e `is_admin_or_gerente` retornam permissões globais. Um `admin` ou `gerente` tem acesso ampliado sobre todas as entidades protegidas por essas funções.

**Localização**  
- Modelo de roles: `supabase/migrations/20251222173104_ec29b95b-5fed-4739-adc6-591b2d4b4b24.sql:16`
- `has_role`: `supabase/migrations/20260403120000_harden_security_policies.sql:16`
- `is_admin_or_gerente`: `supabase/migrations/20260403120000_harden_security_policies.sql:33`
- Uso em policies globais: `supabase/migrations/20260403120000_harden_security_policies.sql:191`, `supabase/migrations/20260403120000_harden_security_policies.sql:226`, `supabase/migrations/20260403120000_harden_security_policies.sql:264`

**Impacto**  
Em cenário multi-tenant, um admin/gerente de uma empresa poderia administrar e visualizar dados de todas as empresas. Mesmo em cenário single-tenant, dificulta segregação por loja, equipe ou filial.

**Recomendação**  
Trocar `user_roles` por `user_roles(user_id, tenant_id, role)` ou `memberships`, com constraint única por tenant. Reescrever `has_role` para receber/derivar tenant e validar role dentro desse tenant.

### 5. 🟠 CRÍTICO — `create_notification_if_enabled` permite notificação arbitrária entre usuários

**Status:** Resolvido ✅

**Correção aplicada**  
A função foi endurecida na migration de remediação: grants diretos foram revogados de `PUBLIC`, `anon` e `authenticated`, chamadas para terceiros foram restringidas e `action_url` passou a aceitar apenas caminhos internos válidos.

**Descrição**  
A função `public.create_notification_if_enabled` é `SECURITY DEFINER`, recebe `_user_id`, `_title`, `_message`, `_action_url`, `_metadata` do chamador e insere/atualiza notificações para o usuário informado. Ela é concedida a `authenticated`, sem checar se o chamador é o próprio usuário, admin/gerente, ou um trigger interno.

**Localização**  
- Função: `supabase/migrations/20260403162000_automate_notifications_and_preferences.sql:8`
- `SECURITY DEFINER`: `supabase/migrations/20260403162000_automate_notifications_and_preferences.sql:21`
- Uso direto de `_user_id`, `_title`, `_message`, `_action_url`: `supabase/migrations/20260403162000_automate_notifications_and_preferences.sql:24`, `supabase/migrations/20260403162000_automate_notifications_and_preferences.sql:43`
- Grant amplo: `supabase/migrations/20260403162000_automate_notifications_and_preferences.sql:405`

**Impacto**  
Qualquer usuário autenticado pode criar spam, mensagens falsas, URLs internas/externas e metadados arbitrários para outros usuários ativos. Isso permite phishing interno, assédio operacional, poluição de auditoria e DoS lógico no centro de notificações.

**Recomendação**  
Revogar `GRANT EXECUTE` para `authenticated` nessa função ou restringir: permitir `_user_id = auth.uid()` somente para categorias benignas, exigir `is_admin_or_gerente(auth.uid())` para notificar terceiros, validar `action_url` contra allowlist de rotas internas, e separar função interna de trigger sem exposição RPC.

### 6. 🟡 ALTO — Margens/custos de veículos são legíveis por qualquer usuário ativo

**Status:** Resolvido ✅

**Correção aplicada**  
A policy de `margens_veiculos` foi restringida para `admin`/`gerente` na migration de remediação. A rota `/margens` também passou a exigir `requiredRoles={["admin", "gerente"]}` em `src/App.tsx`.

**Descrição**  
A policy final de `margens_veiculos` permite `SELECT` para qualquer usuário ativo. O hook de margens busca custo, despesas e observações. A exportação também combina estoque e margens, expondo informações financeiras sensíveis.

**Localização**  
- Policy de leitura ampla: `supabase/migrations/20260403120000_harden_security_policies.sql:301`
- Hook consulta custos/despesas: `src/hooks/useMargens.ts:39`
- Exportação consulta margens: `src/pages/Exportar.tsx:158`

**Impacto**  
Vendedores ou usuários operacionais podem acessar custo do veículo, despesas e margens. Isso pode prejudicar negociação, vazar estratégia comercial e expor informações financeiras internas.

**Recomendação**  
Restringir `SELECT` em `margens_veiculos` a `admin`/`gerente` ou criar views distintas: uma view sem custo/margem para vendedores e outra financeira para gestão. Ajustar UI e exportação para respeitar a mesma regra.

### 7. 🟡 ALTO — Rota de exportação disponível para qualquer usuário autenticado

**Status:** Resolvido ✅

**Correção aplicada**  
A rota `/exportar` passou a exigir `requiredRoles={["admin", "gerente"]}` em `src/App.tsx`, reduzindo a superfície de exfiltração em massa pelo frontend.

**Descrição**  
`/exportar` é protegida apenas por autenticação, sem `requiredRoles`. A página exporta leads, veículos, vendas e margens em CSV conforme o que RLS permitir. Como algumas policies de leitura são amplas, a rota vira um ponto de exfiltração em massa para qualquer usuário ativo.

**Localização**  
- Rota sem roles: `src/App.tsx:112`
- Fetch de leads/exportação: `src/pages/Exportar.tsx:65`, `src/pages/Exportar.tsx:69`, `src/pages/Exportar.tsx:78`
- Fetch de veículos/margens/vendas: `src/pages/Exportar.tsx:143`, `src/pages/Exportar.tsx:158`, `src/pages/Exportar.tsx:181`

**Impacto**  
Um usuário comprometido ou malicioso pode baixar grandes volumes de dados operacionais em CSV. Mesmo com RLS, a superfície de vazamento aumenta muito.

**Recomendação**  
Exigir `requiredRoles={['admin','gerente']}` na rota e reforçar no banco: criar RPC/export views específicas com checagem de role e colunas permitidas. Registrar auditoria de exportações.

### 8. 🟡 ALTO — `n8n_chat_histories` aparece no schema TypeScript sem RLS/políticas no projeto

**Status:** Resolvido ✅

**Correção aplicada**  
A migration de remediação revoga acesso de `anon` e `authenticated` à tabela `n8n_chat_histories` quando ela existe e aplica RLS/force RLS no conjunto de tabelas públicas sensíveis.

**Descrição**  
`n8n_chat_histories` existe no tipo gerado do Supabase, mas não há migrations habilitando RLS, criando policies ou revogando grants para ela. Como o projeto menciona n8n no schema, essa tabela pode conter histórico de chat/IA sensível e fica sem governança declarada no repositório.

**Localização**  
- Tabela no tipo gerado: `src/integrations/supabase/types.ts:465`
- Busca de migrations não encontrou `CREATE POLICY`, `ENABLE ROW LEVEL SECURITY` ou grants para `n8n_chat_histories`.

**Impacto**  
Se a tabela estiver exposta no Supabase real, pode haver vazamento de conversas, prompts, contexto de clientes ou dados operacionais. Mesmo que esteja segura manualmente, a segurança não é reprodutível por IaC.

**Recomendação**  
Adicionar migration explícita para `n8n_chat_histories`: `ENABLE ROW LEVEL SECURITY`, policies por tenant/responsável, e grants mínimos. Se a tabela só deve ser usada por n8n/server, revogar acesso de `anon` e `authenticated` e usar `service_role` apenas em ambiente server-side.

### 9. 🟡 ALTO — `npm audit` aponta 15 vulnerabilidades, incluindo 9 altas

**Status:** Resolvido ✅

**Correção aplicada**  
As dependências vulneráveis foram atualizadas/removidas: `vite` atualizado, `@vitejs/plugin-react-swc` atualizado e `lovable-tagger` removido. A validação `npm audit --json` retornou `0 vulnerabilities`.

**Descrição**  
`npm audit --json` reportou 15 vulnerabilidades: 9 `high` e 6 `moderate`. Entre as altas estão `react-router-dom`/`react-router`, `@remix-run/router`, `rollup`, `lodash`, `glob`, `minimatch`, `picomatch` e `flatted`.

**Localização**  
- Dependências diretas: `package.json:58` (`react-router-dom`), `package.json:83` (`vite`)
- Lockfile afetado: `package-lock.json`
- Resultado do comando: `npm audit --json` no workspace.

**Impacto**  
Inclui XSS/open redirect em React Router, path traversal/arbitrary file write em Rollup, ReDoS/prototype pollution em libs auxiliares e problemas no servidor dev do Vite/esbuild. O risco varia entre runtime e cadeia de build, mas a atualização é necessária.

**Recomendação**  
Executar `npm audit fix` com revisão de lockfile, atualizar `react-router-dom` para versão corrigida, atualizar Vite/Rollup e validar build/testes. Se alguma versão for indireta, usar overrides/resolutions temporários.

### 10. 🔵 MÉDIO — Sessão Supabase persiste em `localStorage` sem CSP/hardening contra XSS

**Status:** Resolvido ✅

**Correção aplicada**  
Foi adicionada Content Security Policy no `index.html`, junto com políticas de `Referrer-Policy` e `Permissions-Policy`, reduzindo o impacto de XSS no contexto do SPA.

**Descrição**  
O cliente Supabase persiste sessão em `localStorage`. Isso é padrão em SPAs, mas aumenta impacto de qualquer XSS, pois access/refresh tokens podem ser lidos por JavaScript. Não há Content Security Policy no `index.html` nem configuração equivalente observada.

**Localização**  
- Persistência em `localStorage`: `src/integrations/supabase/client.ts:13`
- `persistSession` e `autoRefreshToken`: `src/integrations/supabase/client.ts:14`
- `index.html` sem CSP de segurança: `index.html:1`

**Impacto**  
Qualquer XSS ou script de terceiro comprometido pode roubar sessão Supabase. Como o app fala direto com o banco, o token roubado permite acesso até expiração/refresh.

**Recomendação**  
Adicionar CSP restritiva (`script-src`, `connect-src` para Supabase, `img-src` necessário), evitar dependências/scripts não confiáveis, reduzir superfícies de HTML dinâmico, e considerar arquitetura BFF/server-side para fluxos de maior sensibilidade. Revisar tempo de sessão no Supabase Auth.

### 11. 🔵 MÉDIO — Rotas não usam `requiredRoles`; autorização administrativa depende da UI + RLS

**Status:** Resolvido ✅

**Correção aplicada**  
As rotas sensíveis foram protegidas em `src/App.tsx`: `/usuarios` exige `admin`, enquanto `/exportar` e `/margens` exigem `admin` ou `gerente`.

**Descrição**  
`ProtectedRoute` suporta `requiredRoles`, mas nenhuma rota em `App.tsx` passa esse parâmetro. A área de usuários é escondida em `Configuracoes` com `isAdmin`, e o banco bloqueia mutações críticas via RLS, mas a camada de roteamento não expressa as regras.

**Localização**  
- Suporte a roles: `src/components/ProtectedRoute.tsx:7`, `src/components/ProtectedRoute.tsx:58`
- Rotas sem `requiredRoles`: `src/App.tsx:62`, `src/App.tsx:112`, `src/App.tsx:117`, `src/App.tsx:122`, `src/App.tsx:127`
- Aba admin apenas na UI: `src/pages/Configuracoes.tsx:611`

**Impacto**  
Não é bypass direto enquanto RLS estiver correta, mas aumenta risco de exposição acidental de telas, queries sensíveis e funcionalidades futuras sem proteção no backend. Também dificulta auditoria de autorização.

**Recomendação**  
Definir roles por rota para módulos sensíveis (`/exportar`, `/margens`, `/configuracoes?aba=usuarios`) e manter RLS como fonte de verdade. Adicionar testes de navegação por role.

### 12. 🔵 MÉDIO — Ausência de controles locais de rate limiting para login, RPCs e consultas recorrentes

**Status:** Pendente 🟡

**Pendente**  
Este ponto depende principalmente de configuração operacional fora do repositório: limites do Supabase Auth, API gateway/CDN, Edge Functions ou regras de infraestrutura. O código pode receber melhorias adicionais de backoff/debounce, mas a proteção efetiva contra abuso precisa ser aplicada no perímetro/server-side.

**Descrição**  
O login chama diretamente `signInWithPassword`; notificações chamam `sync_notification_automation` a cada 30 segundos; leads atualizam a cada 15 segundos. Não há backend próprio, edge function, rate limit por usuário/IP ou circuit breaker no código.

**Localização**  
- Login direto: `src/contexts/AuthContext.tsx:148`
- Notificações a cada 30s + RPC: `src/hooks/useNotifications.ts:16`, `src/hooks/useNotifications.ts:19`
- Leads a cada 15s: `src/hooks/useLeadsKanban.ts:180`

**Impacto**  
Usuários autenticados podem amplificar carga no banco via polling/RPC. Tentativas de login dependem apenas dos limites nativos do Supabase Auth, sem UX/lockout adicional.

**Recomendação**  
Configurar rate limits no Supabase Auth e API gateway/CDN, reduzir polling com realtime/caching, adicionar debounce/backoff em erros, e mover automações pesadas para cron/edge function com autenticação de serviço.

### 13. 🔵 MÉDIO — Erros do Supabase são exibidos/logados com detalhes excessivos

**Status:** Resolvido ✅

**Correção aplicada**  
Mensagens brutas de erro foram substituídas por mensagens genéricas em telas/componentes, e logs com objetos completos de erro foram removidos ou reduzidos em pontos sensíveis.

**Descrição**  
Alguns componentes exibem `error.message` em toast para o usuário e vários hooks fazem `console.error` com o objeto de erro completo. Isso pode revelar nomes de tabelas, policies, constraints ou detalhes operacionais em produção.

**Localização**  
- Toast com erro bruto: `src/pages/LeadDetail.tsx:109`, `src/pages/LeadDetail.tsx:140`, `src/pages/Vendas.tsx:188`, `src/pages/Vendas.tsx:219`, `src/components/LeadDetailsModal.tsx:201`
- Logs com objetos de erro: `src/contexts/AuthContext.tsx:51`, `src/contexts/AuthContext.tsx:67`, `src/hooks/useTasks.ts:84`, `src/hooks/usePosVendaKanban.ts:123`

**Impacto**  
Facilita enumeração de schema/policies e depuração por atacante autenticado. Em máquinas compartilhadas ou observabilidade de navegador, pode expor dados sensíveis.

**Recomendação**  
Trocar mensagens de usuário por textos genéricos e registrar detalhes apenas em ferramenta segura de observabilidade, com sanitização. Em produção, reduzir `console.error` ou encapsular em logger com níveis.

### 14. ⚪ BAIXO — `.env` local versionável contém URL e chave anon pública do Supabase

**Status:** Resolvido ✅

**Correção aplicada**  
`.env` foi adicionado ao `.gitignore`, e um `.env.example` foi criado para documentar as variáveis sem valores reais.

**Descrição**  
O arquivo `.env` contém `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` e `VITE_SUPABASE_PUBLISHABLE_KEY`. A chave anon é pública por natureza em SPA e também aparece no bundle `dist`, mas `.gitignore` não ignora `.env`, apenas `*.local`.

**Localização**  
- `.env:1`, `.env:2`, `.env:3`
- `.gitignore:13`
- Uso no cliente: `src/integrations/supabase/client.ts:5`, `src/integrations/supabase/client.ts:6`
- Bundle contém URL/chave anon: `dist/assets/index-DQ6-8rkV.js`

**Impacto**  
Não é vazamento de `service_role`, mas publicar `.env` facilita enumeração do projeto Supabase e uso direto da API anon contra as policies. O risco fica crítico se RLS/grants estiverem incorretos.

**Recomendação**  
Adicionar `.env` ao `.gitignore`, manter `.env.example` sem valores reais, e validar que nenhuma chave `service_role` ou segredo de API externa seja exposto em `VITE_*`.

## Plano de Ação Sugerido

### Resolvido ✅ — Contenção imediata

1. RLS/Force RLS habilitado nas tabelas públicas relevantes.
2. `create_notification_if_enabled` endurecida e grants diretos revogados.
3. `/exportar` e `/margens` restritas para `admin`/`gerente`.
4. `/usuarios` restrita para `admin`.
5. Visibilidade ampla de registros `NULL` removida das policies, com atribuição automática em pontos do frontend.

### Resolvido ✅ — Isolamento e autorização

1. Modelo de tenant adicionado com `tenants`, `tenant_id`, `current_tenant_id()` e funções tenant-aware.
2. Policies reescritas para combinar tenant, role e responsável.
3. Roles administrativas passaram a respeitar tenant.
4. `n8n_chat_histories` teve acesso de `anon` e `authenticated` revogado.

### Resolvido ✅ — Hardening do frontend e dependências

1. Dependências atualizadas; `npm audit --json` retornou `0 vulnerabilities`.
2. CSP, Referrer Policy e Permissions Policy adicionadas no `index.html`.
3. Mensagens de erro e logs sensíveis foram reduzidos.
4. `.env` foi adicionado ao `.gitignore` e `.env.example` foi criado.

### Pendente 🟡 — Ações fora do repositório

1. Configurar rate limiting no Supabase Auth para tentativas de login.
2. Aplicar rate limiting/abuse protection em API gateway/CDN ou Edge Functions, se houver camada server-side.
3. Avaliar redução adicional de polling com realtime/backoff para diminuir carga recorrente no banco.
4. Validar em ambiente real com usuários `admin`, `gerente` e `vendedor`, confirmando que RLS bloqueia acesso mesmo quando a tentativa é feita diretamente via Supabase client.
4. Adicionar testes de RLS com usuários `admin`, `gerente`, `vendedor`, usuário inativo e usuário de outro tenant.
