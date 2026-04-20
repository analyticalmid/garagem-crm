-- View agregada de mensagens por chat (evita limite de 1000 linhas)
CREATE OR REPLACE VIEW public.v_mensagens_por_chat AS
SELECT 
  "chatId" as chat_id,
  bool_or(enviada_pelo_agene) as ia_respondeu,
  max(created_at) as last_message_at,
  count(*) as total_mensagens
FROM public."Mensagens_enviadas"
WHERE "chatId" IS NOT NULL
GROUP BY "chatId";

-- Garantir que usuários autenticados possam ler a view
GRANT SELECT ON public.v_mensagens_por_chat TO authenticated;