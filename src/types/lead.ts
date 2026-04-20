export type LeadStatus = 'novo_lead' | 'negociando' | 'vendido' | 'perdido';

export interface Lead {
  id: number;
  nome: string | null;
  telefone: string | null;
  created_at: string;
  status: LeadStatus;
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

export const KANBAN_COLUMNS: { id: LeadStatus; title: string; color: string }[] = [
  { id: 'novo_lead', title: 'Novo Lead', color: 'kanban-novo' },
  { id: 'negociando', title: 'Negociando', color: 'kanban-negociando' },
  { id: 'vendido', title: 'Vendido', color: 'kanban-vendido' },
  { id: 'perdido', title: 'Perdido', color: 'kanban-perdido' },
];
