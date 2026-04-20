DELETE FROM "Contatos_Whatsapp"
WHERE "Telefone_Whatsapp" LIKE '%@lid%'
AND id NOT IN (
  SELECT c.id FROM "Contatos_Whatsapp" c
  JOIN lead_status ls ON ls.telefone = c."Telefone_Whatsapp"
  WHERE ls.status NOT IN ('novo_lead')
);