-- Criar enum para status do veículo
CREATE TYPE public.vehicle_status AS ENUM ('disponivel', 'negociando', 'vendido');

-- Adicionar coluna status à tabela estoque_carros
ALTER TABLE public.estoque_carros 
ADD COLUMN status vehicle_status DEFAULT 'disponivel';

-- Atualizar veículos já vendidos (sold_at não é null)
UPDATE public.estoque_carros 
SET status = 'vendido' 
WHERE sold_at IS NOT NULL;

-- Atualizar veículos inativos para vendido
UPDATE public.estoque_carros 
SET status = 'vendido' 
WHERE active = false AND status = 'disponivel';