# Garagem CRM Manifest

## 1. Resumo Executivo

O sistema atual é um CRM automotivo centrado em operação comercial, estoque, vendas, pré-venda, pós-venda, tarefas, notificações e atendimento por WhatsApp.

Do ponto de vista técnico, o projeto hoje é uma arquitetura híbrida:

- Frontend SPA em React com `react-router-dom`, lazy loading de rotas e cache com TanStack Query.
- Shell e rotas server-side hospedadas em Next.js (`src/app`, `src/app/api/*`), apesar do README ainda mencionar Vite.
- Banco em Supabase/PostgreSQL com RLS ativo nas tabelas principais e endurecido por migrations recentes.
- Camada server própria em `src/app/api/data/route.ts`, usada como BFF leve para validar sessão, papel e consolidar consultas.
- Automações distribuídas entre mutations do app, triggers/RPCs SQL, notificações automáticas e uma Supabase Edge Function de pós-venda com integração Z-API.

Observação importante: o repositório evidencia claramente integração com Supabase e Z-API. Já `n8n` aparece apenas de forma indireta no schema (`n8n_chat_histories`), sem workflow HTTP explícito ou cliente n8n implementado no código atual.

## 2. Arquitetura de Dados (Supabase/PostgreSQL)

### 2.1 Tabelas principais

#### Leads e atendimento

- `Contatos_Whatsapp`
  - Base principal de leads oriundos de WhatsApp.
  - Colunas essenciais: `id`, `nome`, `Telefone_Whatsapp`, `observação`, `created_at`.
- `lead_status`
  - Estado operacional do lead no kanban comercial.
  - Colunas essenciais: `telefone`, `status`, `assigned_to`, `veiculo_interesse`, `observacao`, `updated_at`.
  - Chave lógica: telefone.
- `mensagens_whatsapp`
  - Histórico de mensagens exibido no módulo WhatsApp.
  - Colunas essenciais: `id`, `telefone_id`, `nome_lead`, `mensagem`, `enviado_pelo_vendedor`, `created_at`.
- `conversations`
  - Estrutura de conversa consolidada por telefone.
  - Colunas essenciais: `id`, `telefone`, `lead_id`, `responsavel_id`, `status`, `nao_lidas`, `ultima_mensagem_at`, `created_at`.
- `messages`
  - Mensagens normalizadas vinculadas a `conversations`.
  - Colunas essenciais: `id`, `conversation_id`, `telefone`, `sender`, `conteudo`, `tipo`, `enviada_pelo_agente`, `created_at`.
- `Memoria_PostgreSQL_Whatsapp`
  - Memória/histórico auxiliar de WhatsApp/IA.
  - Colunas essenciais: `id`, `Telefone_whatsapp`, `Mensagem`, `created_at`.
- `Mensagens_enviadas`
  - Registro auxiliar de mensagens outbound.
  - Colunas essenciais: `id`, `chatId`, `idmensagem`, `enviada_pelo_agene`, `created_at`.

#### Pré-venda

- `prevenda_contatos`
  - Pipeline de prospecção para compra de veículos.
  - Colunas essenciais: `id`, `nome`, `telefone_whatsapp`, `status`, `assigned_to`, `observacao`, `veiculo_nome`, `veiculo_marca`, `veiculo_modelo`, `veiculo_km`, `veiculo_cambio`, `veiculo_ano_fab`, `veiculo_ano_mod`, `veiculo_valor`, `created_at`, `updated_at`.

#### Estoque e margem

- `estoque_carros`
  - Base de estoque/inventário.
  - Colunas essenciais: `vehicle_id`, `title`, `marca`, `modelo`, `ano`, `preco`, `km`, `combustivel`, `cor`, `cambio`, `codigo`, `link`, `observacoes`, `status`, `active`, `sold_at`, `last_sync_id`, `created_at`, `updated_at`.
- `estoque_sync_runs`
  - Log de sincronização/importação de estoque.
  - Colunas essenciais: `sync_id`, `source_url`, `started_at`, `finished_at`, `total_received`, `total_upserted`, `total_deactivated`, `total_deleted`.
- `margens_veiculos`
  - Camada financeira por veículo.
  - Colunas essenciais: `id`, `vehicle_id`, `custo_veiculo`, `despesas`, `observacao`, `updated_at`.

#### Vendas e pós-venda

- `vendas`
  - Registro de vendas do estoque e vendas manuais.
  - Colunas essenciais: `id`, `vehicle_id`, `vendedor_id`, `comprador_nome`, `comprador_telefone`, `preco_venda`, `forma_pagamento`, `valor_entrada`, `valor_financiamento`, `data_venda`, `observacao`, `historico_saude`, `nome_veiculo`, `marca_veiculo`, `modelo_veiculo`, `ano_veiculo`, `km_veiculo`, `created_at`, `updated_at`.
- `pos_venda_cards`
  - Quadro operacional de pós-venda e retenção.
  - Colunas essenciais: `id`, `source_key`, `origem`, `lead_id`, `venda_id`, `telefone`, `cliente_nome`, `veiculo_nome`, `proxima_acao`, `etapa`, `status_resumo`, `status_tone`, `prazo_label`, `prazo_tone`, `mensagem_zap`, `responsavel_id`, `responsavel_nome`, `ordem`, `metadata`, `created_by`, `created_at`, `updated_at`.

#### Usuários, segurança e notificações

- `profiles`
  - Perfil operacional do usuário autenticado.
  - Colunas essenciais: `id`, `full_name`, `email`, `phone`, `avatar_url`, `is_active`, `created_at`, `updated_at`.
- `user_roles`
  - Papel de acesso.
  - Colunas essenciais: `id`, `user_id`, `role`, `created_at`.
  - Enum principal: `admin`, `gerente`, `vendedor`.
- `tarefas`
  - Quadro de tarefas da operação.
  - Colunas essenciais: `id`, `titulo`, `descricao`, `status`, `prioridade`, `responsavel_id`, `responsavel_nome`, `origem`, `lead_id`, `venda_id`, `data_vencimento`, `created_at`, `updated_at`.
- `notifications`
  - Centro de notificações.
  - Colunas essenciais: `id`, `user_id`, `title`, `message`, `type`, `category`, `action_url`, `action_label`, `metadata`, `source_key`, `read_at`, `created_at`.
- `notification_preferences`
  - Preferências por usuário.
  - Colunas essenciais: `user_id`, `email_enabled`, `push_enabled`, `lead_enabled`, `task_enabled`, `sale_enabled`, `security_enabled`, `system_enabled`, `created_at`, `updated_at`.

#### Tabelas auxiliares/sensíveis

- `n8n_chat_histories`
  - Evidência de uso de n8n no banco, mas sem integração operacional implementada no código atual.
- `usuarios`
  - Tabela legada mencionada nas migrations de segurança, sem protagonismo no app atual.

### 2.2 Views e funções relevantes

- `view_oportunidades_pos_venda`
  - View que identifica oportunidades de retenção em `180` e `365` dias após a venda.
- `v_estoque_disponivel`
  - View de estoque ativo/disponível.
- `v_mensagens_por_chat`
  - View agregada de mensagens por conversa.
- `append_historico_saude_venda(...)`
  - Acrescenta eventos ao histórico de saúde da venda.
- `sync_notification_automation()`
  - Gera notificações automáticas de tarefas vencidas, leads parados e pré-venda parada.
- `create_notification_if_enabled(...)`
  - Cria/atualiza notificações respeitando preferências do usuário.
- `mark_notification_read(...)` e `mark_all_notifications_read()`
  - Leitura de notificações.
- `can_write_lead_status(...)`
  - Guard de escrita para movimentação/atribuição de leads.

### 2.3 Relacionamentos (Foreign Keys)

- `conversations.lead_id -> Contatos_Whatsapp.id`
- `conversations.responsavel_id -> profiles.id`
- `messages.conversation_id -> conversations.id`
- `prevenda_contatos.assigned_to -> profiles.id`
- `tarefas.responsavel_id -> profiles.id`
- `vendas.vehicle_id -> estoque_carros.vehicle_id`
- `vendas.vendedor_id -> profiles.id`
- `margens_veiculos.vehicle_id -> estoque_carros.vehicle_id`
- `pos_venda_cards.lead_id -> Contatos_Whatsapp.id`
- `pos_venda_cards.venda_id -> vendas.id`
- `pos_venda_cards.responsavel_id -> profiles.id`
- `pos_venda_cards.created_by -> profiles.id`
- `notifications.user_id -> auth.users.id`
- `notification_preferences.user_id -> auth.users.id`

### 2.4 Política de RLS (Row Level Security)

O modelo atual combina RLS com checagens server-side em `/api/me` e `/api/data`. As políticas foram endurecidas principalmente nas migrations de abril de 2026.

#### Regras-base

- Usuário precisa estar ativo em `profiles.is_active = true`.
- Usuário precisa ter role em `user_roles`.
- `admin` e `gerente` têm visão gerencial ampliada.
- `vendedor` opera majoritariamente apenas nos registros sob sua responsabilidade.

#### Por domínio

- `profiles`
  - Usuários ativos podem ler perfis.
  - Cada usuário atualiza o próprio perfil.
  - `admin` pode gerenciar perfis.
- `user_roles`
  - Usuário comum lê o próprio papel.
  - `admin`/`gerente` leem visão ampliada.
  - Mutações de papel são administrativas.
- `lead_status`
  - Leitura: `admin`/`gerente` ou responsável.
  - Escrita: protegida por `can_write_lead_status`, evitando reassignment arbitrário por vendedor.
- `Contatos_Whatsapp`
  - Leitura: escopo de equipe; após hardening, a intenção é limitar o vendedor aos leads que possuam `lead_status.assigned_to = auth.uid()`.
  - Gestão ampla: `admin`/`gerente`.
- `prevenda_contatos`
  - Leitura e escrita por `admin`/`gerente` ou `assigned_to`.
- `tarefas`
  - Leitura e mutação por `admin`/`gerente` ou `responsavel_id`.
- `vendas`
  - Leitura por `admin`/`gerente` ou `vendedor_id`.
  - Vendedor pode inserir/atualizar venda própria.
- `margens_veiculos`
  - Leitura financeira restrita a `admin`/`gerente`.
- `pos_venda_cards`
  - Leitura, insert e update por `admin`/`gerente` ou `responsavel_id`.
- `notifications`
  - Usuário lê apenas as próprias notificações.
  - Inserções operacionais são feitas por função segura/triggers.
- `notification_preferences`
  - Usuário lê e altera apenas a própria configuração.
- `mensagens_whatsapp`
  - Usuários ativos podem ler/inserir/atualizar.
  - Observação: o controle aqui é mais amplo que em `conversations/messages`, então o backend compensa com filtragem por contexto.

#### Observação de segurança

As migrations de remediação também introduzem sinais de isolamento por tenant (`tenant_id`, `current_tenant_id()`, policies restritivas). Porém o client type gerado ainda não está totalmente alinhado com essa evolução, então o repositório sugere uma transição em andamento entre modelo single-tenant endurecido e modelo multi-tenant.

## 3. Frontend (React + Router + Next Shell)

### 3.1 Arquitetura do frontend

- Núcleo em React 18.
- Navegação SPA com `react-router-dom`.
- Shell, API routes e bootstrap server-side em Next.js.
- Código lazy-loaded por rota via `routeImporters`.
- Layout autenticado compartilhado por sidebar, topo, notificações e command bar.

### 3.2 Rotas principais

- `/` - Login
- `/dashboard` - Dashboard executivo
- `/leads` - Kanban comercial
- `/leads/:id` - Detalhe do lead
- `/prevenda` - Kanban de prospecção
- `/prevenda/:id` - Detalhe de pré-venda
- `/veiculos` - Catálogo e filtros do estoque
- `/veiculos/:id` - Detalhe do veículo
- `/vendas` - Gestão e consolidação de vendas
- `/pos-venda` - Kanban de pós-venda/retensão
- `/tarefas` - Kanban operacional de tarefas
- `/whatsapp` - Inbox de atendimento
- `/margens` - Gestão financeira por veículo
- `/exportar` - Exportação CSV
- `/configuracoes` - Perfil, notificações e gestão administrativa
- `/usuarios` - Redireciona para a aba administrativa de configurações

### 3.3 Componentes e módulos de UI

- Kanbans
  - `KanbanColumn`, `LeadCard`
  - `PrevendaKanbanColumn`, `PrevendaLeadCard`
  - `TaskKanbanColumn`, `TaskCard`
  - Pós-venda com drag and drop customizado em `PosVenda.tsx`
- Dashboards e analytics
  - `Dashboard`
  - `SalesCharts`
  - cards de KPI com `Recharts`
- Atendimento
  - `ConversationList`
  - `ChatWindow`
  - `LeadSidebar`
- Gestão
  - `LeadDetailsModal`
  - `PrevendaLeadDetailsModal`
  - `TaskFormModal`
  - `UserManagementSection`
  - `NotificationCenter`
  - `SearchCommandBar`

### 3.4 Gerenciamento de estado

- Estado remoto
  - TanStack Query é o mecanismo principal.
  - Hooks dedicados: `useLeadsKanban`, `usePrevendaLeadsKanban`, `usePosVendaKanban`, `useTasks`, `useUsers`, `useMargens`, `useNotifications`.
  - Uso de `invalidateQueries`, optimistic update e polling em módulos operacionais.
- Estado de autenticação
  - `AuthContext` mantém `user`, `session`, `profile`, `role` e permissões derivadas.
- Estado local
  - `useState`, `useEffect`, `useMemo`, `useDeferredValue`.
  - Formulários são majoritariamente controlados manualmente; `react-hook-form` existe em dependências, mas não é o padrão dominante nesta base.
- Não há uso de Redux, Zustand, MobX ou Contexts de domínio adicionais.

### 3.5 Bibliotecas de UI

- Base visual
  - Tailwind CSS
  - `shadcn/ui`
  - Radix UI primitives
- Interações
  - `@hello-pangea/dnd` para drag-and-drop
  - `sonner` e toaster interno para feedback
  - `cmdk` para command palette
- Visualização
  - `recharts`
  - `lucide-react`
- Observação
  - Não há evidência de `framer-motion` em `package.json` nem no código atual.

## 4. Fluxos de Automação (Supabase + Z-API + sinais de n8n)

### 4.1 O que existe de fato no código

- Mutações do frontend chamando `/api/data`.
- Triggers SQL no Supabase.
- RPCs de notificação e leitura.
- Edge Function `supabase/functions/auto-pos-venda`.
- Persistência de mensagens em `mensagens_whatsapp`.

### 4.2 Gatilhos identificados

- `Mover lead de coluna`
  - Dispara `PATCH /api/data?op=lead-status`.
  - Atualiza `lead_status`.
  - Recarrega kanban e WhatsApp.
- `Enviar mensagem no WhatsApp`
  - Dispara `POST /api/data?op=whatsapp-send-message`.
  - Persiste mensagem outbound em `mensagens_whatsapp`.
- `Enviar mensagem no pós-venda`
  - Dispara `POST /api/data?op=pos-venda-send-message`.
  - Atualiza `historico_saude` da venda.
  - Atualiza `pos_venda_cards`.
  - Registra mensagem na timeline do WhatsApp.
- `Registrar venda`
  - `notify_sale_created()` cria notificações para vendedor, admins e gerentes.
- `Abrir centro de notificações`
  - Executa `sync_notification_automation()`.
  - Gera alertas para tarefas vencidas, leads sem andamento e pré-venda parada.
- `Auto pós-venda`
  - Edge Function consulta `view_oportunidades_pos_venda`.
  - Em janelas de `180` e `365` dias, dispara mensagem automática via Z-API.

### 4.3 Como o WhatsApp está integrado às ações do usuário

- O módulo `/whatsapp` funciona como uma caixa de entrada operacional.
- As conversas são reconstruídas a partir de `mensagens_whatsapp`.
- O sidebar do lead permite:
  - editar nome e observação;
  - trocar status do lead;
  - refletir isso no kanban de leads.
- No pós-venda, o botão `Enviar Mensagem`:
  - usa a mensagem sugerida do card;
  - grava no histórico de saúde da venda;
  - atualiza o resumo do card;
  - registra a mensagem em `mensagens_whatsapp`.

### 4.4 Sobre n8n

- O repositório contém `n8n_chat_histories` no schema.
- Não encontrei:
  - webhook HTTP para n8n;
  - client n8n;
  - URL/config de workflow;
  - dispatcher dedicado.
- Conclusão: n8n pode existir na operação externa, mas não está implementado de forma rastreável neste código.

## 5. Funcionalidades por Status

### 5.1 Módulos com implementação operacional sólida

- Autenticação e perfil com Supabase Auth
- Controle de acesso por `admin`, `gerente`, `vendedor`
- Pipeline de leads com kanban, criação, edição, atribuição e exclusão
- Pipeline de pré-venda com kanban e detalhe rico do lead
- Estoque com filtros e detalhe de veículo
- Vendas com edição de venda do estoque e venda manual
- Tarefas com kanban, filtros, criação, edição e exclusão
- Margens com persistência em `margens_veiculos`
- Centro de notificações com preferências por usuário
- WhatsApp operacional com inbox, leitura e envio persistido
- Pós-venda com cards automáticos e manuais, arrastar entre etapas e mensagens sugeridas

### 5.2 Em desenvolvimento, maturação ou com dependências externas

- Integração real de envio WhatsApp no módulo principal
  - Hoje o app registra mensagens em banco; o disparo real explícito está formalizado na Edge Function de auto pós-venda.
- Automação n8n
  - Não há evidência operacional no código.
- Multi-tenant completo
  - Há sinais fortes nas migrations de segurança, mas o schema TypeScript ainda não reflete tudo.
- Provisionamento de novos usuários
  - A UI de “Novo Usuário” está desabilitada; criação ocorre via Supabase Dashboard.
- Integrações com portais e mídia paga
  - Não há implementação clara/reprodutível no repositório atual.

## 6. Diferenciais Técnicos

### 6.1 Permissões por nível de usuário

- `admin`
  - Gestão total de usuários, perfis, papéis, leads, margens e visão ampla.
- `gerente`
  - Visão gerencial ampla das operações, sem gestão plena de usuários.
- `vendedor`
  - Trabalho focado nos próprios leads, vendas, tarefas e cards atribuídos.

Há enforcement em três camadas:

- UI com `ProtectedRoute requiredRoles`
- `AuthContext` com permissões derivadas
- RLS + validação no backend `/api/data`

### 6.2 Pós-venda inteligente

- Geração automática de cards a partir de leads vendidos e da view `view_oportunidades_pos_venda`.
- Mensagens sugeridas por janela de retenção:
  - `180 dias` para check-up
  - `365 dias` para oferta de troca
- Histórico de saúde do cliente armazenado em `vendas.historico_saude`.

### 6.3 Performance e experiência

- Lazy loading por rota.
- Prefetch seletivo de dados e rotas.
- Polling controlado em módulos de operação.
- Optimistic UI em kanbans.
- BFF leve reduzindo acoplamento do frontend com queries sensíveis do banco.

### 6.4 Integrações com portais (Webmotors, OLX, Facebook Ads)

O que o repositório comprova hoje:

- Existe estrutura de sincronização de estoque:
  - `estoque_carros.last_sync_id`
  - `estoque_sync_runs`
  - função `sync_prune_inventory`
- Existe campo `link` no veículo para abrir anúncio original.

O que não encontrei implementado explicitamente:

- conectores nomeados para Webmotors;
- conectores nomeados para OLX;
- ingestão direta de Facebook Ads/Meta Lead Ads;
- mapeamento de origem por portal no frontend atual.

Conclusão: há preparação para sincronização/importação de inventário, mas as integrações com portais não estão evidenciadas de forma inequívoca neste repositório.

## 7. Conclusão Arquitetural

O estado atual do Garagem CRM já configura uma plataforma operacional bastante consistente para a garagem:

- CRM comercial com kanban de leads
- prospecção de compra
- estoque e margem
- vendas
- tarefas
- notificações
- atendimento por WhatsApp
- pós-venda com inteligência de retenção

Os pontos mais maduros são operação comercial, estoque, vendas, tarefas, segurança/RLS e pós-venda orientado a réguas. Os pontos que ainda exigem consolidação arquitetural são integração externa rastreável com n8n/portais, envio WhatsApp 100% desacoplado no fluxo principal e alinhamento completo entre migrations multi-tenant e tipos gerados do cliente.
