DROP POLICY "Only admin can delete tasks" ON public.tarefas;

CREATE POLICY "Delete tasks based on role" ON public.tarefas
FOR DELETE USING (
  is_admin_or_gerente(auth.uid())
  OR responsavel_id = auth.uid()
);