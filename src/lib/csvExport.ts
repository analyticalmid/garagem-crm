import { format } from "date-fns";

/**
 * Formata um valor para moeda brasileira (R$ X.XXX,XX)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata uma data para DD/MM/YYYY
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch {
    return date;
  }
}

/**
 * Escapa um valor para CSV (lida com aspas e separadores)
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  // Se contém ; ou " ou quebra de linha, envolver em aspas e duplicar aspas internas
  if (stringValue.includes(";") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Gera o timestamp para o nome do arquivo (YYYY-MM-DD_HH-mm)
 */
function getFileTimestamp(): string {
  return format(new Date(), "yyyy-MM-dd_HH-mm");
}

/**
 * Exporta dados para CSV e faz download
 * @param data - Array de objetos com os dados
 * @param columns - Array de { key, header } para definir colunas
 * @param filenamePrefix - Prefixo do arquivo (ex: "leads_pipeline")
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filenamePrefix: string
): void {
  // Cabeçalho
  const header = columns.map((col) => escapeCSVValue(col.header)).join(";");

  // Linhas de dados
  const rows = data.map((row) =>
    columns.map((col) => escapeCSVValue(row[col.key] as string | number | null)).join(";")
  );

  // Juntar tudo com quebra de linha
  const csvContent = [header, ...rows].join("\n");

  // Adicionar BOM para UTF-8 (Excel reconhece acentos)
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8" });

  // Criar link e fazer download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}_${getFileTimestamp()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
