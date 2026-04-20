-- Remover contatos sem telefone (leads duplicados de Graciela e Liliane Deknis)
DELETE FROM "Contatos_Whatsapp" WHERE "Telefone_Whatsapp" IS NULL;