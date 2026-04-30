export type PipelineKey = "leads" | "prevenda";

export interface PipelineColumn {
  key: string;
  title: string;
  position: number;
  isDefault: boolean;
  isActive: boolean;
  color: string;
}

const LEADS_DEFAULT_COLUMNS: PipelineColumn[] = [
  { key: "novo_lead", title: "Novo Lead", position: 0, isDefault: true, isActive: true, color: "#3B82F6" },
  { key: "negociando", title: "Negociando", position: 1, isDefault: true, isActive: true, color: "#F59E0B" },
  { key: "vendido", title: "Vendido", position: 2, isDefault: true, isActive: true, color: "#10B981" },
  { key: "perdido", title: "Perdido", position: 3, isDefault: true, isActive: true, color: "#EF4444" },
];

const PREVENDA_DEFAULT_COLUMNS: PipelineColumn[] = [
  { key: "novo_lead", title: "Novo Lead", position: 0, isDefault: true, isActive: true, color: "#60A5FA" },
  { key: "negociando", title: "Negociando", position: 1, isDefault: true, isActive: true, color: "#FB923C" },
  { key: "em_analise", title: "Em Análise", position: 2, isDefault: true, isActive: true, color: "#FACC15" },
  { key: "comprado", title: "Comprado", position: 3, isDefault: true, isActive: true, color: "#2DD4BF" },
  { key: "standby", title: "Stand by", position: 4, isDefault: true, isActive: true, color: "#94A3B8" },
];

const LEADS_PALETTE = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316", "#22C55E"];
const PREVENDA_PALETTE = ["#60A5FA", "#FB923C", "#FACC15", "#2DD4BF", "#94A3B8", "#A78BFA", "#F472B6", "#34D399"];

export function getDefaultPipelineColumns(pipelineKey: PipelineKey): PipelineColumn[] {
  const source = pipelineKey === "leads" ? LEADS_DEFAULT_COLUMNS : PREVENDA_DEFAULT_COLUMNS;
  return source.map((column) => ({ ...column }));
}

export function getPipelinePalette(pipelineKey: PipelineKey) {
  return pipelineKey === "leads" ? LEADS_PALETTE : PREVENDA_PALETTE;
}

export function getPipelineColumnLabel(columns: PipelineColumn[], key: string) {
  return columns.find((column) => column.key === key)?.title ?? humanizeColumnKey(key);
}

export function getPipelineColumnColor(columns: PipelineColumn[], key: string, pipelineKey: PipelineKey) {
  return columns.find((column) => column.key === key)?.color ?? getNextPipelineColor(pipelineKey, 0);
}

export function getNextPipelineColor(pipelineKey: PipelineKey, index: number) {
  const palette = getPipelinePalette(pipelineKey);
  return palette[index % palette.length];
}

export function getFirstPipelineColumnKey(columns: PipelineColumn[]) {
  return columns[0]?.key ?? "novo_lead";
}

export function getNegotiatingColumnKey(columns: PipelineColumn[]) {
  const explicit = columns.find((column) => column.key === "negociando");
  if (explicit) return explicit.key;
  return columns[1]?.key ?? getFirstPipelineColumnKey(columns);
}

export function buildPipelineGroups<T extends { status: string }>(items: T[], columns: PipelineColumn[]) {
  const groups = columns.reduce<Record<string, T[]>>((acc, column) => {
    acc[column.key] = [];
    return acc;
  }, {});

  items.forEach((item) => {
    const fallbackKey = columns[0]?.key;
    const targetKey = groups[item.status] ? item.status : fallbackKey;
    if (!targetKey) return;
    groups[targetKey].push(item);
  });

  return groups;
}

export function humanizeColumnKey(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function slugifyColumnTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function ensureUniqueColumnKey(baseKey: string, existingKeys: string[]) {
  const normalized = baseKey || "coluna";
  if (!existingKeys.includes(normalized)) return normalized;

  let suffix = 2;
  while (existingKeys.includes(`${normalized}_${suffix}`)) {
    suffix += 1;
  }

  return `${normalized}_${suffix}`;
}
