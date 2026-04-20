
-- Create margens_veiculos table
CREATE TABLE public.margens_veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id text NOT NULL UNIQUE REFERENCES public.estoque_carros(vehicle_id) ON DELETE CASCADE,
  custo_veiculo numeric NOT NULL DEFAULT 0,
  despesas numeric NOT NULL DEFAULT 0,
  observacao text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.margens_veiculos ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users
CREATE POLICY "Authenticated users can view margens"
ON public.margens_veiculos FOR SELECT
TO authenticated
USING (true);

-- INSERT: admin or gerente
CREATE POLICY "Admin and gerente can insert margens"
ON public.margens_veiculos FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_gerente(auth.uid()));

-- UPDATE: admin or gerente
CREATE POLICY "Admin and gerente can update margens"
ON public.margens_veiculos FOR UPDATE
TO authenticated
USING (is_admin_or_gerente(auth.uid()));

-- DELETE: admin only
CREATE POLICY "Only admin can delete margens"
ON public.margens_veiculos FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER set_margens_veiculos_updated_at
BEFORE UPDATE ON public.margens_veiculos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
