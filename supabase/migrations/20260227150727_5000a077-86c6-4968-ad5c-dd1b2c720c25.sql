
-- 1. Excluir registros existentes sem nome E sem telefone
DELETE FROM "Contatos_Whatsapp"
WHERE nome IS NULL AND "Telefone_Whatsapp" IS NULL;

-- 2. Criar trigger para impedir futuros registros inválidos
CREATE OR REPLACE FUNCTION public.validate_contato_whatsapp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Rejeitar se tanto nome quanto telefone forem NULL ou vazios
  IF (NEW.nome IS NULL OR TRIM(NEW.nome) = '') 
     AND (NEW."Telefone_Whatsapp" IS NULL OR TRIM(NEW."Telefone_Whatsapp") = '') THEN
    RAISE EXCEPTION 'Contato deve ter pelo menos nome ou telefone preenchido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_contato_whatsapp
BEFORE INSERT OR UPDATE ON "Contatos_Whatsapp"
FOR EACH ROW
EXECUTE FUNCTION public.validate_contato_whatsapp();
