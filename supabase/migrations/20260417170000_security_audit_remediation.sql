-- Security audit remediation: tenant guardrails, RLS hardening and RPC restrictions.

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants'
      AND column_name = 'slug'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tenants'
        AND column_name = 'is_active'
    ) THEN
      INSERT INTO public.tenants (id, name, slug, is_active)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Garagem CRM', 'garagem-crm', true)
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.tenants (id, name, slug)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Garagem CRM', 'garagem-crm')
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    INSERT INTO public.tenants (id, name)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Garagem CRM')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;

ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL;

DROP POLICY IF EXISTS "Active users can view own tenant" ON public.tenants;
CREATE POLICY "Active users can view own tenant"
ON public.tenants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.tenant_id = tenants.id
      AND p.is_active = true
  )
);

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.tenant_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.tenant_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.tenant_id
  FROM public.profiles p
  WHERE p.id = _user_id
    AND p.is_active = true
  LIMIT 1
$$;

ALTER TABLE public.profiles
ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

ALTER TABLE public.user_roles
ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id AND p.tenant_id = ur.tenant_id
    WHERE ur.user_id = _user_id
      AND p.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.is_active = true
      AND public.has_any_role(_user_id)
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
    JOIN public.profiles p ON p.id = ur.user_id AND p.tenant_id = ur.tenant_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND p.is_active = true
      AND p.tenant_id = public.current_tenant_id()
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
    JOIN public.profiles p ON p.id = ur.user_id AND p.tenant_id = ur.tenant_id
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin', 'gerente')
      AND p.is_active = true
      AND p.tenant_id = public.current_tenant_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id AND p.tenant_id = ur.tenant_id
  WHERE ur.user_id = _user_id
    AND p.is_active = true
    AND p.tenant_id = public.current_tenant_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_active, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    false,
    _tenant_id
  );

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'vendedor', _tenant_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_lead_status(_telefone text, _new_assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH existing_record AS (
    SELECT ls.assigned_to, ls.tenant_id
    FROM public.lead_status ls
    WHERE ls.telefone = _telefone
      AND ls.tenant_id = public.current_tenant_id()
    LIMIT 1
  )
  SELECT CASE
    WHEN public.is_admin_or_gerente(auth.uid()) THEN true
    WHEN NOT public.is_active_user(auth.uid()) THEN false
    WHEN EXISTS (SELECT 1 FROM existing_record) THEN EXISTS (
      SELECT 1
      FROM existing_record er
      WHERE er.assigned_to = auth.uid()
        AND _new_assigned_to = auth.uid()
    )
    ELSE _new_assigned_to = auth.uid()
  END
$$;

DO $$
DECLARE
  table_names text[] := ARRAY[
    'lead_status',
    'Contatos_Whatsapp',
    'Mensagens_enviadas',
    'Memoria_PostgreSQL_Whatsapp',
    'estoque_carros',
    'vendas',
    'margens_veiculos',
    'tarefas',
    'prevenda_contatos',
    'conversations',
    'messages',
    'notifications',
    'notification_preferences',
    'pos_venda_cards',
    'n8n_chat_histories',
    'usuarios'
  ];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) DEFAULT %L NOT NULL',
        table_name,
        '00000000-0000-0000-0000-000000000001'
      );
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', table_name);

      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);

      EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation guard" ON public.%I', table_name);
      EXECUTE format(
        'CREATE POLICY "Tenant isolation guard" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())',
        table_name
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation guard" ON public.profiles;
CREATE POLICY "Tenant isolation guard"
ON public.profiles AS RESTRICTIVE FOR ALL
TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Tenant isolation guard" ON public.user_roles;
CREATE POLICY "Tenant isolation guard"
ON public.user_roles AS RESTRICTIVE FOR ALL
TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Active users view lead_status by role" ON public.lead_status;
CREATE POLICY "Active users view lead_status by role"
ON public.lead_status FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
  )
);

DROP POLICY IF EXISTS "Active users insert lead_status by role" ON public.lead_status;
CREATE POLICY "Active users insert lead_status by role"
ON public.lead_status FOR INSERT
TO authenticated
WITH CHECK (public.can_write_lead_status(telefone, assigned_to));

DROP POLICY IF EXISTS "Active users update lead_status by role" ON public.lead_status;
CREATE POLICY "Active users update lead_status by role"
ON public.lead_status FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
  )
)
WITH CHECK (public.can_write_lead_status(telefone, assigned_to));

DROP POLICY IF EXISTS "Contacts visible by team scope" ON public."Contatos_Whatsapp";
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
        AND ls.tenant_id = public.current_tenant_id()
        AND ls.assigned_to = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Prevenda visible by team scope" ON public.prevenda_contatos;
CREATE POLICY "Prevenda visible by team scope"
ON public.prevenda_contatos FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
  )
);

DROP POLICY IF EXISTS "Active users can insert prevenda_contatos" ON public.prevenda_contatos;
CREATE POLICY "Active users can insert prevenda_contatos"
ON public.prevenda_contatos FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR assigned_to = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tasks visible by team scope" ON public.tarefas;
CREATE POLICY "Tasks visible by team scope"
ON public.tarefas FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Sales visible by team scope" ON public.vendas;
CREATE POLICY "Sales visible by team scope"
ON public.vendas FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR vendedor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Active users can view pos_venda_cards" ON public.pos_venda_cards;
CREATE POLICY "Active users can view pos_venda_cards"
ON public.pos_venda_cards FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Active users can insert pos_venda_cards" ON public.pos_venda_cards;
CREATE POLICY "Active users can insert pos_venda_cards"
ON public.pos_venda_cards FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR responsavel_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Active users can update pos_venda_cards" ON public.pos_venda_cards;
CREATE POLICY "Active users can update pos_venda_cards"
ON public.pos_venda_cards FOR UPDATE
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

DROP POLICY IF EXISTS "Active users can view margens" ON public.margens_veiculos;
CREATE POLICY "Active admin gerente can view margens"
ON public.margens_veiculos FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

DO $$
BEGIN
  IF to_regclass('public.n8n_chat_histories') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public can select n8n chat histories" ON public.n8n_chat_histories';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can select n8n chat histories" ON public.n8n_chat_histories';
    EXECUTE 'REVOKE ALL ON public.n8n_chat_histories FROM anon';
    EXECUTE 'REVOKE ALL ON public.n8n_chat_histories FROM authenticated';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_notification_if_enabled(uuid, text, text, public.notification_category, public.notification_type, text, text, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification_if_enabled(uuid, text, text, public.notification_category, public.notification_type, text, text, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification_if_enabled(uuid, text, text, public.notification_category, public.notification_type, text, text, jsonb, text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_notification_if_enabled(
  _user_id uuid,
  _title text,
  _message text,
  _category public.notification_category default 'system',
  _type public.notification_type default 'info',
  _action_url text default null,
  _action_label text default null,
  _metadata jsonb default '{}'::jsonb,
  _source_key text default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _preferences public.notification_preferences%rowtype;
  _notification_id uuid;
  _current_user_id uuid := auth.uid();
  _target_tenant_id uuid := public.tenant_id_for_user(_user_id);
BEGIN
  IF _user_id IS NULL OR NOT public.is_active_user(_user_id) THEN
    RETURN NULL;
  END IF;

  IF _target_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF _current_user_id IS NOT NULL
    AND _current_user_id <> _user_id
    AND NOT public.is_admin_or_gerente(_current_user_id) THEN
    RAISE EXCEPTION 'not allowed to notify another user';
  END IF;

  IF _action_url IS NOT NULL AND _action_url !~ '^/[A-Za-z0-9/_?=&.-]*$' THEN
    RAISE EXCEPTION 'invalid notification action_url';
  END IF;

  INSERT INTO public.notification_preferences (user_id, tenant_id)
  VALUES (_user_id, _target_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT *
    INTO _preferences
  FROM public.notification_preferences
  WHERE user_id = _user_id
    AND tenant_id = _target_tenant_id;

  IF (_category = 'lead' AND NOT _preferences.lead_enabled)
    OR (_category = 'task' AND NOT _preferences.task_enabled)
    OR (_category = 'sale' AND NOT _preferences.sale_enabled)
    OR (_category = 'security' AND NOT _preferences.security_enabled)
    OR (_category = 'system' AND NOT _preferences.system_enabled) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    category,
    type,
    action_url,
    action_label,
    metadata,
    source_key,
    read_at,
    tenant_id
  ) VALUES (
    _user_id,
    _title,
    _message,
    _category,
    _type,
    _action_url,
    _action_label,
    coalesce(_metadata, '{}'::jsonb),
    _source_key,
    null,
    _target_tenant_id
  )
  ON CONFLICT (user_id, source_key) WHERE source_key IS NOT NULL
  DO UPDATE SET
    title = excluded.title,
    message = excluded.message,
    category = excluded.category,
    type = excluded.type,
    action_url = excluded.action_url,
    action_label = excluded.action_label,
    metadata = excluded.metadata,
    read_at = null,
    created_at = timezone('utc', now())
  RETURNING id INTO _notification_id;

  RETURN _notification_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_notification_if_enabled(uuid, text, text, public.notification_category, public.notification_type, text, text, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification_if_enabled(uuid, text, text, public.notification_category, public.notification_type, text, text, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification_if_enabled(uuid, text, text, public.notification_category, public.notification_type, text, text, jsonb, text) FROM authenticated;
