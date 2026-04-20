CREATE TABLE public.pos_venda_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  origem text NOT NULL DEFAULT 'manual',
  lead_id bigint NULL REFERENCES public."Contatos_Whatsapp"(id) ON DELETE SET NULL,
  telefone text NOT NULL,
  cliente_nome text NOT NULL,
  veiculo_nome text NOT NULL,
  proxima_acao text NOT NULL,
  etapa text NOT NULL DEFAULT 'venda_realizada',
  status_resumo text NOT NULL DEFAULT 'Sincronizado da venda',
  status_tone text NOT NULL DEFAULT 'azul',
  prazo_label text NOT NULL DEFAULT 'Hoje',
  prazo_tone text NOT NULL DEFAULT 'azul',
  mensagem_zap text NOT NULL,
  responsavel_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsavel_nome text NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_venda_cards_origem_check CHECK (origem IN ('automatico', 'manual')),
  CONSTRAINT pos_venda_cards_etapa_check CHECK (etapa IN ('venda_realizada', 'checklist_entrega', 'followup_satisfacao', 'oferta_recompra')),
  CONSTRAINT pos_venda_cards_status_tone_check CHECK (status_tone IN ('azul', 'verde', 'amarelo', 'vermelho', 'neutro')),
  CONSTRAINT pos_venda_cards_prazo_tone_check CHECK (prazo_tone IN ('azul', 'verde', 'amarelo', 'vermelho', 'neutro'))
);

CREATE INDEX idx_pos_venda_cards_etapa_ordem ON public.pos_venda_cards (etapa, ordem, created_at DESC);
CREATE INDEX idx_pos_venda_cards_lead_id ON public.pos_venda_cards (lead_id);
CREATE INDEX idx_pos_venda_cards_responsavel_id ON public.pos_venda_cards (responsavel_id);
CREATE INDEX idx_pos_venda_cards_source_key ON public.pos_venda_cards (source_key);

ALTER TABLE public.pos_venda_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view pos_venda_cards"
ON public.pos_venda_cards FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR responsavel_id IS NULL
  )
);

CREATE POLICY "Active users can insert pos_venda_cards"
ON public.pos_venda_cards FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR responsavel_id IS NULL
  )
);

CREATE POLICY "Active users can update pos_venda_cards"
ON public.pos_venda_cards FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR responsavel_id IS NULL
  )
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR responsavel_id IS NULL
  )
);

CREATE POLICY "Admin gerente or owner can delete pos_venda_cards"
ON public.pos_venda_cards FOR DELETE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR created_by = auth.uid()
  )
);

CREATE TRIGGER set_pos_venda_cards_updated_at
BEFORE UPDATE ON public.pos_venda_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_venda_cards;