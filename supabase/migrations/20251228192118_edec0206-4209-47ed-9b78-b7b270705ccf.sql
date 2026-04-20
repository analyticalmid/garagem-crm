-- Corrigir SECURITY DEFINER na view v_mensagens_por_chat
ALTER VIEW public.v_mensagens_por_chat SET (security_invoker = true);