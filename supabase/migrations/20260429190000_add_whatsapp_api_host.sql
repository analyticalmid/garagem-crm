ALTER TABLE public.zapi_webhooks
  ADD COLUMN IF NOT EXISTS api_host text;
