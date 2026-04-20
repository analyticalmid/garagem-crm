CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
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

CREATE OR REPLACE FUNCTION public.can_write_lead_status(_telefone text, _new_assigned_to uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH existing_record AS (
    SELECT ls.assigned_to
    FROM public.lead_status ls
    WHERE ls.telefone = _telefone
    LIMIT 1
  )
  SELECT CASE
    WHEN public.is_admin_or_gerente(auth.uid()) THEN true
    WHEN NOT public.is_active_user(auth.uid()) THEN false
    WHEN EXISTS (SELECT 1 FROM existing_record) THEN EXISTS (
      SELECT 1
      FROM existing_record er
      WHERE (er.assigned_to = auth.uid() OR er.assigned_to IS NULL)
        AND er.assigned_to IS NOT DISTINCT FROM _new_assigned_to
    )
    ELSE _new_assigned_to IS NULL
  END
$$;

DROP POLICY IF EXISTS "Active users insert lead_status by role" ON public.lead_status;
DROP POLICY IF EXISTS "Active users update lead_status by role" ON public.lead_status;

CREATE POLICY "Active users insert lead_status by role"
ON public.lead_status FOR INSERT
TO authenticated
WITH CHECK (
  public.can_write_lead_status(telefone, assigned_to)
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
  public.can_write_lead_status(telefone, assigned_to)
);