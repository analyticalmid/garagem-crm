import { getDefaultPipelineColumns, type PipelineColumn } from "@/lib/kanbanColumns";

export type LeadStatus = string;

export interface Lead {
  id: number;
  nome: string | null;
  telefone: string | null;
  created_at: string;
  status: LeadStatus;
  statusColor?: string;
  iaRespondeu: boolean;
  assigned_to: string | null;
  assignedUserName?: string | null;
  channel?: "whatsapp" | "instagram" | null;
  leadType?: string | null;
  lastInteractionAt?: string | null;
}

export interface LeadStatusRecord {
  telefone: string;
  status: LeadStatus;
  assigned_to: string | null;
  updated_at: string;
}

export const KANBAN_COLUMNS: { id: LeadStatus; title: string; color: string }[] = getDefaultPipelineColumns("leads").map((column) => ({
  id: column.key,
  title: column.title,
  color: column.color,
}));

export type LeadPipelineColumn = PipelineColumn;
