ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active users can view mensagens_whatsapp" ON public.mensagens_whatsapp;
CREATE POLICY "Active users can view mensagens_whatsapp"
ON public.mensagens_whatsapp FOR SELECT
TO authenticated
USING (
  public.is_active_user(auth.uid())
);

DROP POLICY IF EXISTS "Active users can insert mensagens_whatsapp" ON public.mensagens_whatsapp;
CREATE POLICY "Active users can insert mensagens_whatsapp"
ON public.mensagens_whatsapp FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
);

DROP POLICY IF EXISTS "Active users can update mensagens_whatsapp" ON public.mensagens_whatsapp;
CREATE POLICY "Active users can update mensagens_whatsapp"
ON public.mensagens_whatsapp FOR UPDATE
TO authenticated
USING (
  public.is_active_user(auth.uid())
)
WITH CHECK (
  public.is_active_user(auth.uid())
);
