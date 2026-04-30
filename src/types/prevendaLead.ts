import { getDefaultPipelineColumns, type PipelineColumn } from "@/lib/kanbanColumns";

export type PrevendaLeadStatus = string;

export interface PrevendaLead {
  id: number;
  nome: string | null;
  telefone_whatsapp: string | null;
  created_at: string;
  status: PrevendaLeadStatus;
  statusColor?: string;
  assigned_to: string | null;
  assignedUserName?: string | null;
  observacao: string | null;
  veiculo_nome: string | null;
  veiculo_marca: string | null;
  veiculo_modelo: string | null;
  veiculo_km: number | null;
  veiculo_cambio: string | null;
  veiculo_ano_fab: number | null;
  veiculo_ano_mod: number | null;
  veiculo_valor: number | null;
  updated_at: string | null;
}

export const PREVENDA_KANBAN_COLUMNS: {
  id: PrevendaLeadStatus;
  title: string;
  color: string;
}[] = getDefaultPipelineColumns("prevenda").map((column) => ({
  id: column.key,
  title: column.title,
  color: column.color,
}));

export type PrevendaPipelineColumn = PipelineColumn;
