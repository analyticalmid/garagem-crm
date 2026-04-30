ALTER TABLE public.zapi_webhooks
  ADD COLUMN IF NOT EXISTS zapi_client_token text;
