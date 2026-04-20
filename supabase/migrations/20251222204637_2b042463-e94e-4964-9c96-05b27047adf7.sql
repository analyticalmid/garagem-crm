-- RLS policies para Contatos_Whatsapp
CREATE POLICY "Authenticated users can view contacts"
ON public."Contatos_Whatsapp"
FOR SELECT
TO authenticated
USING (true);

-- Permitir admin/gerente gerenciar contatos
CREATE POLICY "Admin and gerente can manage contacts"
ON public."Contatos_Whatsapp"
FOR ALL
TO authenticated
USING (is_admin_or_gerente(auth.uid()))
WITH CHECK (is_admin_or_gerente(auth.uid()));

-- RLS policies para Mensagens_enviadas
CREATE POLICY "Authenticated users can view messages"
ON public."Mensagens_enviadas"
FOR SELECT
TO authenticated
USING (true);

-- RLS policy para Memoria_PostgreSQL_Whatsapp (usada para calcular status)
CREATE POLICY "Authenticated users can view memory"
ON public."Memoria_PostgreSQL_Whatsapp"
FOR SELECT
TO authenticated
USING (true);