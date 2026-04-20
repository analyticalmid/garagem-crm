CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND p.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gerente(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin', 'gerente')
      AND p.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    false
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor');

  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ALTER COLUMN is_active SET DEFAULT false;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin can update all" ON public.profiles;

CREATE POLICY "Active users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Only active admin can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active users can update own profile or admin all"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admin can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admin can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admin can delete roles" ON public.user_roles;

CREATE POLICY "Active users can view roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Only active admin can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only active admin can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only active admin can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "View lead_status based on role" ON public.lead_status;
DROP POLICY IF EXISTS "Insert lead_status for authenticated" ON public.lead_status;
DROP POLICY IF EXISTS "Update lead_status based on role" ON public.lead_status;
DROP POLICY IF EXISTS "Admin and gerente can delete lead_status" ON public.lead_status;

CREATE POLICY "Active users view lead_status by role"
ON public.lead_status FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
  )
);

CREATE POLICY "Active users insert lead_status by role"
ON public.lead_status FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
  )
);

CREATE POLICY "Active users update lead_status by role"
ON public.lead_status FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
  )
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
  )
);

CREATE POLICY "Only active admin gerente can delete lead_status"
ON public.lead_status FOR DELETE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public."Contatos_Whatsapp";
DROP POLICY IF EXISTS "Admin and gerente can manage contacts" ON public."Contatos_Whatsapp";

CREATE POLICY "Active users can view contacts"
ON public."Contatos_Whatsapp" FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active admin gerente can manage contacts"
ON public."Contatos_Whatsapp" FOR ALL
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can view messages" ON public."Mensagens_enviadas";
DROP POLICY IF EXISTS "Authenticated users can view memory" ON public."Memoria_PostgreSQL_Whatsapp";

CREATE POLICY "Active users can view outbound messages"
ON public."Mensagens_enviadas" FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active users can view whatsapp memory"
ON public."Memoria_PostgreSQL_Whatsapp" FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.estoque_carros;
DROP POLICY IF EXISTS "Admin and gerente can update vehicles" ON public.estoque_carros;
DROP POLICY IF EXISTS "Admin can insert vehicles" ON public.estoque_carros;
DROP POLICY IF EXISTS "Admin can delete vehicles" ON public.estoque_carros;

CREATE POLICY "Active users can view vehicles"
ON public.estoque_carros FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active admin gerente can update vehicles"
ON public.estoque_carros FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

CREATE POLICY "Only active admin can insert vehicles"
ON public.estoque_carros FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only active admin can delete vehicles"
ON public.estoque_carros FOR DELETE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.vendas;
DROP POLICY IF EXISTS "Admin and gerente can manage sales" ON public.vendas;
DROP POLICY IF EXISTS "Vendedor can insert own sales" ON public.vendas;
DROP POLICY IF EXISTS "Vendedor can update own sales" ON public.vendas;

CREATE POLICY "Active users can view sales"
ON public.vendas FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active admin gerente can manage sales"
ON public.vendas FOR ALL
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

CREATE POLICY "Active vendedor can insert own sales"
ON public.vendas FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND vendedor_id = auth.uid()
);

CREATE POLICY "Active vendedor can update own sales"
ON public.vendas FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND vendedor_id = auth.uid()
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND vendedor_id = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated users can view margens" ON public.margens_veiculos;
DROP POLICY IF EXISTS "Admin and gerente can insert margens" ON public.margens_veiculos;
DROP POLICY IF EXISTS "Admin and gerente can update margens" ON public.margens_veiculos;
DROP POLICY IF EXISTS "Only admin can delete margens" ON public.margens_veiculos;

CREATE POLICY "Active users can view margens"
ON public.margens_veiculos FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active admin gerente can insert margens"
ON public.margens_veiculos FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

CREATE POLICY "Active admin gerente can update margens"
ON public.margens_veiculos FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

CREATE POLICY "Only active admin can delete margens"
ON public.margens_veiculos FOR DELETE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tarefas;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tarefas;
DROP POLICY IF EXISTS "Update tasks based on role" ON public.tarefas;
DROP POLICY IF EXISTS "Only admin can delete tasks" ON public.tarefas;
DROP POLICY IF EXISTS "Delete tasks based on role" ON public.tarefas;

CREATE POLICY "Active users can view tasks"
ON public.tarefas FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active users can create tasks"
ON public.tarefas FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    responsavel_id IS NULL
    OR responsavel_id = auth.uid()
    OR public.is_admin_or_gerente(auth.uid())
  )
);

CREATE POLICY "Active users update tasks by role"
ON public.tarefas FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  )
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  )
);

CREATE POLICY "Active users delete tasks by role"
ON public.tarefas FOR DELETE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can view prevenda_contatos" ON public.prevenda_contatos;
DROP POLICY IF EXISTS "Authenticated users can insert prevenda_contatos" ON public.prevenda_contatos;
DROP POLICY IF EXISTS "Update prevenda_contatos based on role" ON public.prevenda_contatos;

CREATE POLICY "Active users can view prevenda_contatos"
ON public.prevenda_contatos FOR SELECT
TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Active users can insert prevenda_contatos"
ON public.prevenda_contatos FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    assigned_to IS NULL
    OR assigned_to = auth.uid()
    OR public.is_admin_or_gerente(auth.uid())
  )
);

CREATE POLICY "Active users update prevenda_contatos by role"
ON public.prevenda_contatos FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
  )
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
  )
);

DROP POLICY IF EXISTS "Select conversations based on role" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Update conversations based on role" ON public.conversations;
DROP POLICY IF EXISTS "Only admin can delete conversations" ON public.conversations;

CREATE POLICY "Active users select conversations by role"
ON public.conversations FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR responsavel_id IS NULL
  )
);

CREATE POLICY "Active users insert conversations by role"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
    OR responsavel_id IS NULL
  )
);

CREATE POLICY "Active users update conversations by role"
ON public.conversations FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  )
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  )
);

CREATE POLICY "Only active admin can delete conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Select messages if can see conversation" ON public.messages;
DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Admin gerente can update messages" ON public.messages;
DROP POLICY IF EXISTS "Admin gerente can delete messages" ON public.messages;

CREATE POLICY "Active users select messages by conversation access"
ON public.messages FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND (
        public.is_admin_or_gerente(auth.uid())
        OR c.responsavel_id = auth.uid()
        OR c.responsavel_id IS NULL
      )
  )
);

CREATE POLICY "Active users insert messages by conversation access"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND (
        public.is_admin_or_gerente(auth.uid())
        OR c.responsavel_id = auth.uid()
        OR c.responsavel_id IS NULL
      )
  )
);

CREATE POLICY "Active admin gerente can update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

CREATE POLICY "Active admin gerente can delete messages"
ON public.messages FOR DELETE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'usuarios'
  ) THEN
    DROP POLICY IF EXISTS "Allow all operations on usuarios" ON public.usuarios;
    DROP POLICY IF EXISTS "Only admin can manage usuarios" ON public.usuarios;

    CREATE POLICY "Only admin can manage usuarios"
    ON public.usuarios FOR ALL
    TO authenticated
    USING (
      public.is_active_user(auth.uid())
      AND public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
      public.is_active_user(auth.uid())
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;