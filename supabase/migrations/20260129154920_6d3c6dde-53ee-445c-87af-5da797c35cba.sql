-- Adicionar novas colunas à tabela prevenda_contatos
ALTER TABLE public.prevenda_contatos
ADD COLUMN IF NOT EXISTS status text DEFAULT 'novo_lead',
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS observacao text,
ADD COLUMN IF NOT EXISTS veiculo_nome text,
ADD COLUMN IF NOT EXISTS veiculo_marca text,
ADD COLUMN IF NOT EXISTS veiculo_modelo text,
ADD COLUMN IF NOT EXISTS veiculo_km integer,
ADD COLUMN IF NOT EXISTS veiculo_cambio text,
ADD COLUMN IF NOT EXISTS veiculo_ano_fab integer,
ADD COLUMN IF NOT EXISTS veiculo_ano_mod integer,
ADD COLUMN IF NOT EXISTS veiculo_valor numeric,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Habilitar RLS na tabela
ALTER TABLE public.prevenda_contatos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Authenticated users can view prevenda_contatos"
ON public.prevenda_contatos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert prevenda_contatos"
ON public.prevenda_contatos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Update prevenda_contatos based on role"
ON public.prevenda_contatos FOR UPDATE
TO authenticated
USING (
  is_admin_or_gerente(auth.uid()) 
  OR assigned_to = auth.uid() 
  OR assigned_to IS NULL
);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_prevenda_contatos_updated_at
BEFORE UPDATE ON public.prevenda_contatos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();