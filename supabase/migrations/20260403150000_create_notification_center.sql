DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_type'
  ) THEN
    CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'error');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_category'
  ) THEN
    CREATE TYPE public.notification_category AS ENUM ('system', 'lead', 'task', 'sale', 'security');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'info',
  category public.notification_category NOT NULL DEFAULT 'system',
  action_url text,
  action_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_id_read_at_idx
  ON public.notifications (user_id, read_at);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT false,
  push_enabled boolean NOT NULL DEFAULT true,
  lead_enabled boolean NOT NULL DEFAULT true,
  task_enabled boolean NOT NULL DEFAULT true,
  sale_enabled boolean NOT NULL DEFAULT true,
  security_enabled boolean NOT NULL DEFAULT true,
  system_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_preferences_updated ON public.notification_preferences;
CREATE TRIGGER on_notification_preferences_updated
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE PROCEDURE public.handle_notification_preferences_updated_at();

CREATE OR REPLACE FUNCTION public.handle_profile_notification_bootstrap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    category,
    action_url,
    action_label
  )
  VALUES (
    NEW.id,
    'Central de notificações pronta',
    'Acompanhe alertas do CRM, tarefas e atualizações da operação em um só lugar.',
    'info',
    'system',
    '/configuracoes',
    'Abrir configurações'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_notification_bootstrap ON public.profiles;
CREATE TRIGGER on_profile_created_notification_bootstrap
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_profile_notification_bootstrap();

CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = _notification_id
    AND user_id = auth.uid()
    AND public.is_active_user(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated_count integer := 0;
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL
    AND public.is_active_user(auth.uid());

  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RETURN _updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admin gerente create notifications" ON public.notifications;
CREATE POLICY "Admin gerente create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND public.is_admin_or_gerente(auth.uid())
);

DROP POLICY IF EXISTS "Users view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users view own notification preferences"
ON public.notification_preferences FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users update own notification preferences"
ON public.notification_preferences FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND user_id = auth.uid()
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND user_id = auth.uid()
);

INSERT INTO public.notification_preferences (user_id)
SELECT p.id
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.notifications (
  user_id,
  title,
  message,
  type,
  category,
  action_url,
  action_label
)
SELECT
  p.id,
  'Central de notificações pronta',
  'Acompanhe alertas do CRM, tarefas e atualizações da operação em um só lugar.',
  'info',
  'system',
  '/configuracoes',
  'Abrir configurações'
FROM public.profiles p
WHERE p.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = p.id
      AND n.title = 'Central de notificações pronta'
      AND n.category = 'system'
  );