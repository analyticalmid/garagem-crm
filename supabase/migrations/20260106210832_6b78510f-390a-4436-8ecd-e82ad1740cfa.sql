-- Criar enum para prioridade de tarefas
CREATE TYPE public.task_priority AS ENUM ('baixa', 'media', 'alta');

-- Criar enum para status de tarefas
CREATE TYPE public.task_status AS ENUM ('a_fazer', 'em_andamento', 'concluida', 'cancelada');

-- Criar tabela de tarefas
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  status public.task_status NOT NULL DEFAULT 'a_fazer',
  prioridade public.task_priority DEFAULT 'media',
  responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsavel_nome TEXT,
  data_vencimento DATE,
  origem TEXT, -- 'manual', 'lead', 'venda'
  lead_id UUID, -- para vínculo futuro
  venda_id UUID, -- para vínculo futuro
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER set_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Habilitar RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Policy: todos autenticados podem ver tarefas
CREATE POLICY "Authenticated users can view tasks"
  ON public.tarefas FOR SELECT
  USING (true);

-- Policy: todos autenticados podem criar tarefas
CREATE POLICY "Authenticated users can create tasks"
  ON public.tarefas FOR INSERT
  WITH CHECK (true);

-- Policy: responsável, admin ou gerente podem atualizar
CREATE POLICY "Update tasks based on role"
  ON public.tarefas FOR UPDATE
  USING (
    is_admin_or_gerente(auth.uid()) 
    OR responsavel_id = auth.uid() 
    OR responsavel_id IS NULL
  );

-- Policy: apenas admin pode deletar (mas preferimos soft delete via status)
CREATE POLICY "Only admin can delete tasks"
  ON public.tarefas FOR DELETE
  USING (has_role(auth.uid(), 'admin'));