# Estrutura de Planos - Garagem CRM

Este documento define os limites operacionais e permissões de acesso por nível de assinatura para o Garagem CRM.

## 1. Tabela de Preços

| Plano | Valor Mensal | Foco Operacional |
| :--- | :--- | :--- |
| **Plano Pro** | R$ 397,00 | Organização e Controle de Estoque |
| **Plano Essencial** | R$ 597,00 | Escala, Prospecção e Retenção |

---

## 2. Detalhamento dos Planos

### 🟢 Plano Pro (R$ 397)
*Ideal para lojistas independentes que precisam digitalizar a operação básica.*

* **Usuários:** 1 Usuário.
* **Módulo CRM:** Kanban de Leads e Vendas.
* **Módulo Estoque:** Gestão completa de inventário.
* **Tarefas:** Calendário e quadro operacional de tarefas.
* **WhatsApp:** 1 instância conectada (Z-API).
* **Segurança:** Proteção via Row Level Security (RLS).

### 🔵 Plano Essencial (R$ 597)
*Focado em crescimento acelerado e inteligência de dados.*

* **Usuários:** Até 3 Usuários simultâneos.
* **Módulo Prospecção:** Acesso à aba de Pré-venda (Compra de veículos).
* **Módulo Pós-Venda:** Gestão de retenção e histórico de saúde da venda.
* **Financeiro:** Dashboard de Margens e Lucratividade por veículo.
* **WhatsApp:** Suporte para até 2 instâncias simultâneas.
* **Automação:** Régua de relacionamento manual/semi-automática.

---

## 3. Matriz de Permissões (Feature Flags)

| Feature | Pro | Essencial | Tabela Supabase |
| :--- | :---: | :---: | :--- |
| Kanban de Leads | ✅ | ✅ | `lead_status` |
| Gestão de Estoque | ✅ | ✅ | `estoque_carros` |
| Tarefas | ✅ | ✅ | `tarefas` |
| **Prospecção (Pré-venda)** | ❌ | ✅ | `prevenda_contatos` |
| **Pós-Venda** | ❌ | ✅ | `pos_venda_cards` |
| **Gestão de Margens** | ❌ | ✅ | `margens_veiculos` |

---

## 4. Notas de Implementação

1. **Paywall de UI:** As abas de Prospecção e Pós-Venda devem permanecer visíveis no menu lateral para usuários do Plano Pro, mas ao serem clicadas, devem disparar o Modal de Upgrade.
2. **Hardening de Banco:** O acesso às tabelas `margens_veiculos`, `prevenda_contatos` e `pos_venda_cards` deve ser validado via RLS checando a coluna `plan_type` no perfil do usuário.
3. **WhatsApp:** O plano Essencial permite uma segunda instância para separar o fluxo de prospecção fria do atendimento comercial.