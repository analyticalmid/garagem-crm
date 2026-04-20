export type TaskStatus = 'a_fazer' | 'em_andamento' | 'concluida' | 'cancelada';
export type TaskPriority = 'baixa' | 'media' | 'alta';

export interface Task {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TaskStatus;
  prioridade: TaskPriority | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  data_vencimento: string | null;
  origem: string | null;
  lead_id: string | null;
  venda_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export const TASK_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'a_fazer', title: 'A Fazer' },
  { id: 'em_andamento', title: 'Em Andamento' },
  { id: 'concluida', title: 'Concluída' },
  { id: 'cancelada', title: 'Cancelada' },
];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};
