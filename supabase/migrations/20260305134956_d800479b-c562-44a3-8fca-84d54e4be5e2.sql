
-- Limpeza de duplicatas na prevenda_contatos
-- Mantém o melhor registro de cada grupo de nomes duplicados
DELETE FROM public.prevenda_contatos
WHERE id NOT IN (
  SELECT DISTINCT ON (LOWER(TRIM(nome))) id
  FROM public.prevenda_contatos
  WHERE nome IS NOT NULL AND TRIM(nome) != ''
  ORDER BY LOWER(TRIM(nome)),
    CASE 
      WHEN telefone_whatsapp IS NOT NULL AND (telefone_whatsapp LIKE '%@s.whatsapp.net' OR telefone_whatsapp LIKE '+55%') THEN 0
      WHEN telefone_whatsapp IS NOT NULL AND telefone_whatsapp LIKE '%@lid' THEN 1
      WHEN telefone_whatsapp IS NOT NULL AND TRIM(telefone_whatsapp) != '' THEN 2
      ELSE 3
    END,
    created_at ASC
)
AND nome IS NOT NULL AND TRIM(nome) != ''
AND LOWER(TRIM(nome)) IN (
  SELECT LOWER(TRIM(nome))
  FROM public.prevenda_contatos
  WHERE nome IS NOT NULL AND TRIM(nome) != ''
  GROUP BY LOWER(TRIM(nome))
  HAVING COUNT(*) > 1
);
