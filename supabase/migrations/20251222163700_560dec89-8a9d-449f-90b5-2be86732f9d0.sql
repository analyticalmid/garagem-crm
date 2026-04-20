-- Tabela auxiliar para persistir status dos leads (mínima, apenas para CRM)
CREATE TABLE public.lead_status (
  telefone TEXT PRIMARY KEY,
  status TEXT DEFAULT 'novo_lead' CHECK (status IN ('novo_lead', 'negociando', 'vendido', 'perdido')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_lead_status_updated_at
  BEFORE UPDATE ON public.lead_status
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Habilitar RLS
ALTER TABLE public.lead_status ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura pública (CRM interno)
CREATE POLICY "Allow public read on lead_status"
  ON public.lead_status
  FOR SELECT
  USING (true);

-- Policy para permitir insert/update público (CRM interno sem auth por enquanto)
CREATE POLICY "Allow public insert on lead_status"
  ON public.lead_status
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on lead_status"
  ON public.lead_status
  FOR UPDATE
  USING (true);