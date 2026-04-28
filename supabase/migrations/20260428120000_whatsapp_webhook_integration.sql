-- =============================================================================
-- WhatsApp Webhook Integration
-- Remove n8n dependency — Z-API webhooks handled directly by Edge Function
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA lojas
--    Cada loja tem sua própria instância Z-API. A Edge Function identifica
--    o tenant pelo instanceId recebido no payload do webhook.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lojas (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
                            DEFAULT '00000000-0000-0000-0000-000000000001',
  nome_loja   text        NOT NULL,
  zapi_instance_id text   NOT NULL,
  zapi_token  text        NOT NULL,
  ativo       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lojas_instance_id_idx
  ON public.lojas (zapi_instance_id);

CREATE INDEX IF NOT EXISTS lojas_tenant_idx
  ON public.lojas (tenant_id);

-- Trigger updated_at
CREATE TRIGGER set_lojas_updated_at
  BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. RLS — lojas
-- -----------------------------------------------------------------------------
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas FORCE ROW LEVEL SECURITY;

-- Tenant isolation (restrictive — aplicado antes das permissivas)
CREATE POLICY "lojas_tenant_isolation"
  ON public.lojas
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING  (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Leitura: qualquer usuário ativo do tenant
CREATE POLICY "lojas_select_active_user"
  ON public.lojas FOR SELECT
  TO authenticated
  USING (public.is_active_user(auth.uid()));

-- Escrita: apenas admin/gerente
CREATE POLICY "lojas_insert_admin_gerente"
  ON public.lojas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "lojas_update_admin_gerente"
  ON public.lojas FOR UPDATE
  TO authenticated
  USING  (public.is_admin_or_gerente(auth.uid()))
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "lojas_delete_admin"
  ON public.lojas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- -----------------------------------------------------------------------------
-- 3. Ajustes em conversations
--    Adicionamos ultimo_contato_em como alias de ultima_mensagem_at (já existe),
--    mais loja_id para rastrear qual instância Z-API originou a conversa.
-- -----------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_loja_id
  ON public.conversations (loja_id);

-- -----------------------------------------------------------------------------
-- 4. Ajustes em messages
--    Campo zapi_msg_id para idempotência (evitar duplicatas de webhook).
--    direcao distingue mensagens recebidas de mensagens enviadas pelo agente.
-- -----------------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS zapi_msg_id  text,
  ADD COLUMN IF NOT EXISTS direcao      text NOT NULL DEFAULT 'inbound'
    CHECK (direcao IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS tipo_midia   text,
  ADD COLUMN IF NOT EXISTS url_midia    text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_zapi_msg_id
  ON public.messages (zapi_msg_id)
  WHERE zapi_msg_id IS NOT NULL;

-- Migra campo legado enviada_pelo_agente → direcao
UPDATE public.messages
  SET direcao = 'outbound'
  WHERE enviada_pelo_agente = true AND direcao = 'inbound';

-- -----------------------------------------------------------------------------
-- 5. Ajustes em lead_status
--    ultimo_contato_em: quando o lead mandou/recebeu mensagem pela última vez.
--    Mantemos os status existentes; o webhook reseta 'perdido' → 'novo_lead'.
-- -----------------------------------------------------------------------------
ALTER TABLE public.lead_status
  ADD COLUMN IF NOT EXISTS ultimo_contato_em timestamptz;

-- Índice para queries "leads sem contato há X dias"
CREATE INDEX IF NOT EXISTS idx_lead_status_ultimo_contato
  ON public.lead_status (ultimo_contato_em DESC NULLS LAST);

-- -----------------------------------------------------------------------------
-- 6. Índice extra em Contatos_Whatsapp para lookup rápido por telefone
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contatos_whatsapp_telefone
  ON public."Contatos_Whatsapp" ("Telefone_Whatsapp");

-- -----------------------------------------------------------------------------
-- 7. Políticas RLS atualizadas para conversations/messages com tenant guard
--    (as políticas originais não tinham tenant isolation restritiva)
-- -----------------------------------------------------------------------------

-- Conversations — tenant guard
DROP POLICY IF EXISTS "conversations_tenant_isolation" ON public.conversations;
CREATE POLICY "conversations_tenant_isolation"
  ON public.conversations
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING  (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Messages — tenant guard
DROP POLICY IF EXISTS "messages_tenant_isolation" ON public.messages;
CREATE POLICY "messages_tenant_isolation"
  ON public.messages
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING  (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
