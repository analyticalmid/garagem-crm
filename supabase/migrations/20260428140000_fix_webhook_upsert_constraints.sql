-- =============================================================================
-- Fix: adiciona constraints UNIQUE necessárias para os upserts do webhook
-- =============================================================================

-- conversations: uma conversa por telefone por tenant
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_telefone_tenant_unique;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_telefone_tenant_unique
  UNIQUE (telefone, tenant_id);

-- messages: idempotência por zapi_msg_id (NULLs são sempre distintos em UNIQUE)
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_zapi_msg_id_unique;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_zapi_msg_id_unique
  UNIQUE (zapi_msg_id);

-- Remove o índice parcial anterior (substituído pela constraint acima)
DROP INDEX IF EXISTS public.idx_messages_zapi_msg_id;
