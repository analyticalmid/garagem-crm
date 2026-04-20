export type PrevendaLeadStatus = 
  | 'novo_lead' 
  | 'negociando' 
  | 'em_analise' 
  | 'comprado' 
  | 'standby';

export interface PrevendaLead {
  id: number;
  nome: string | null;
  telefone_whatsapp: string | null;
  created_at: string;
  status: PrevendaLeadStatus;
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
  color: string 
}[] = [
  { id: 'novo_lead', title: 'Novo Lead', color: 'prevenda-novo' },
  { id: 'negociando', title: 'Negociando', color: 'prevenda-negociando' },
  { id: 'em_analise', title: 'Em Análise', color: 'prevenda-analise' },
  { id: 'comprado', title: 'Comprado', color: 'prevenda-comprado' },
  { id: 'standby', title: 'Stand by', color: 'prevenda-standby' },
];
