-- Criar enum para forma de pagamento
CREATE TYPE forma_pagamento AS ENUM ('avista', 'financiado');

-- Criar tabela de vendas
CREATE TABLE vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES estoque_carros(vehicle_id) ON DELETE CASCADE,
  
  -- Dados do comprador
  comprador_nome TEXT,
  comprador_telefone TEXT,
  
  -- Valores
  preco_venda NUMERIC,
  forma_pagamento forma_pagamento,
  valor_entrada NUMERIC,
  valor_financiamento NUMERIC,
  
  -- Datas
  data_venda DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Vendedor (referência ao usuário que registrou)
  vendedor_id UUID REFERENCES profiles(id),
  
  -- Garantir uma venda por veículo
  UNIQUE(vehicle_id)
);

-- Trigger para updated_at
CREATE TRIGGER set_vendas_updated_at
  BEFORE UPDATE ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Habilitar RLS
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view sales"
  ON vendas FOR SELECT
  USING (true);

CREATE POLICY "Admin and gerente can manage sales"
  ON vendas FOR ALL
  USING (is_admin_or_gerente(auth.uid()))
  WITH CHECK (is_admin_or_gerente(auth.uid()));

CREATE POLICY "Vendedor can insert own sales"
  ON vendas FOR INSERT
  WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "Vendedor can update own sales"
  ON vendas FOR UPDATE
  USING (vendedor_id = auth.uid());