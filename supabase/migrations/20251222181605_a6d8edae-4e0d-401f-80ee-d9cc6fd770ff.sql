-- Policy de leitura: todos os usuários autenticados podem ver veículos
CREATE POLICY "Authenticated users can view vehicles"
ON public.estoque_carros
FOR SELECT
TO authenticated
USING (true);

-- Policy de atualização: apenas admin e gerente podem editar
CREATE POLICY "Admin and gerente can update vehicles"
ON public.estoque_carros
FOR UPDATE
TO authenticated
USING (is_admin_or_gerente(auth.uid()))
WITH CHECK (is_admin_or_gerente(auth.uid()));

-- Policy de inserção: apenas admin pode inserir
CREATE POLICY "Admin can insert vehicles"
ON public.estoque_carros
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy de deleção: apenas admin pode deletar
CREATE POLICY "Admin can delete vehicles"
ON public.estoque_carros
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));