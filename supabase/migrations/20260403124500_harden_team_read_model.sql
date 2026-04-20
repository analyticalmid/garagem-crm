DROP POLICY IF EXISTS "Active users can view roles" ON public.user_roles;

CREATE POLICY "Admins gerentes view all roles and users view own"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Active users can view contacts" ON public."Contatos_Whatsapp";

CREATE POLICY "Contacts visible by team scope"
ON public."Contatos_Whatsapp" FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.lead_status ls
      WHERE ls.telefone = "Contatos_Whatsapp"."Telefone_Whatsapp"
        AND (ls.assigned_to = auth.uid() OR ls.assigned_to IS NULL)
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.lead_status ls
      WHERE ls.telefone = "Contatos_Whatsapp"."Telefone_Whatsapp"
    )
  )
);

DROP POLICY IF EXISTS "Active users can view prevenda_contatos" ON public.prevenda_contatos;

CREATE POLICY "Prevenda visible by team scope"
ON public.prevenda_contatos FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
  )
);

DROP POLICY IF EXISTS "Active users can view tasks" ON public.tarefas;

CREATE POLICY "Tasks visible by team scope"
ON public.tarefas FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR responsavel_id IS NULL
  )
);

DROP POLICY IF EXISTS "Active users can view sales" ON public.vendas;

CREATE POLICY "Sales visible by team scope"
ON public.vendas FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR vendedor_id = auth.uid()
    OR vendedor_id IS NULL
  )
);