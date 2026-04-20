
-- =============================================
-- 1. Tabela conversations
-- =============================================
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  lead_id bigint REFERENCES public."Contatos_Whatsapp"(id),
  status text NOT NULL DEFAULT 'aberta',
  responsavel_id uuid REFERENCES public.profiles(id),
  ultima_mensagem_at timestamptz,
  nao_lidas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_telefone ON public.conversations (telefone);
CREATE INDEX idx_conversations_ultima_msg ON public.conversations (ultima_mensagem_at DESC);
CREATE INDEX idx_conversations_status ON public.conversations (status);

-- =============================================
-- 2. Tabela messages
-- =============================================
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  telefone text NOT NULL,
  sender text NOT NULL,
  conteudo text,
  tipo text NOT NULL DEFAULT 'text',
  enviada_pelo_agente boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id);
CREATE INDEX idx_messages_created ON public.messages (created_at DESC);

-- =============================================
-- 3. RLS — conversations
-- =============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select conversations based on role"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR responsavel_id IS NULL
  );

CREATE POLICY "Authenticated can insert conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Update conversations based on role"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  );

CREATE POLICY "Only admin can delete conversations"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. RLS — messages
-- =============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select messages if can see conversation"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          is_admin_or_gerente(auth.uid())
          OR c.responsavel_id = auth.uid()
          OR c.responsavel_id IS NULL
        )
    )
  );

CREATE POLICY "Authenticated can insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin gerente can update messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin gerente can delete messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (is_admin_or_gerente(auth.uid()));

-- =============================================
-- 5. Realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
