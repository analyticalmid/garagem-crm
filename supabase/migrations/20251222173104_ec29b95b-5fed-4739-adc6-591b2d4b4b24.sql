-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'vendedor');

-- 2. Criar tabela profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Criar tabela user_roles (separada para evitar privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Adicionar campo assigned_to na tabela lead_status
ALTER TABLE public.lead_status 
ADD COLUMN assigned_to UUID REFERENCES auth.users(id);

-- 5. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Função security definer para verificar roles (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. Função para verificar admin ou gerente
CREATE OR REPLACE FUNCTION public.is_admin_or_gerente(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gerente')
  )
$$;

-- 8. Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 9. Trigger para criar profile automaticamente quando usuário é criado no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Por padrão, novos usuários são vendedores
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Trigger para updated_at em profiles
CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_profiles_updated_at();

-- 11. RLS Policies para profiles
-- Usuários autenticados podem ver todos os perfis
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Apenas admin pode inserir profiles (trigger cuida do auto-insert)
CREATE POLICY "Only admin can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin pode editar qualquer perfil, usuário pode editar o próprio (exceto is_active)
CREATE POLICY "Users can update own profile or admin can update all"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- 12. RLS Policies para user_roles
-- Usuários autenticados podem ver roles
CREATE POLICY "Authenticated users can view roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

-- Apenas admin pode inserir roles
CREATE POLICY "Only admin can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admin pode atualizar roles
CREATE POLICY "Only admin can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Apenas admin pode deletar roles
CREATE POLICY "Only admin can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 13. Atualizar RLS para lead_status (adicionar filtro por assigned_to)
-- Primeiro, dropar as políticas antigas
DROP POLICY IF EXISTS "Allow public read on lead_status" ON public.lead_status;
DROP POLICY IF EXISTS "Allow public insert on lead_status" ON public.lead_status;
DROP POLICY IF EXISTS "Allow public update on lead_status" ON public.lead_status;

-- Criar novas políticas com RBAC
CREATE POLICY "View lead_status based on role"
ON public.lead_status FOR SELECT
TO authenticated
USING (
  public.is_admin_or_gerente(auth.uid())
  OR assigned_to = auth.uid()
  OR assigned_to IS NULL
);

CREATE POLICY "Insert lead_status for authenticated"
ON public.lead_status FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Update lead_status based on role"
ON public.lead_status FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_gerente(auth.uid())
  OR assigned_to = auth.uid()
  OR assigned_to IS NULL
);