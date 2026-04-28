ALTER TABLE public."Contatos_Whatsapp"
ADD COLUMN IF NOT EXISTS "observação" text;

NOTIFY pgrst, 'reload schema';
