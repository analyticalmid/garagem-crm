
-- 1. Make vehicle_id nullable in vendas
ALTER TABLE public.vendas ALTER COLUMN vehicle_id DROP NOT NULL;

-- 2. Add manual vehicle columns to vendas
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS nome_veiculo text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS marca_veiculo text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS modelo_veiculo text;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS ano_veiculo integer;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS km_veiculo integer;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS observacao text;

-- 3. Add DELETE policy for lead_status
CREATE POLICY "Admin and gerente can delete lead_status"
ON public.lead_status FOR DELETE
USING (is_admin_or_gerente(auth.uid()));
