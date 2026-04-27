export type PosVendaColumnId = "venda_realizada" | "checklist_entrega" | "followup_satisfacao" | "oferta_recompra";

export type PosVendaTone = "azul" | "verde" | "amarelo" | "vermelho" | "neutro";

export type PosVendaOrigem = "Automático" | "Manual";

export type PosVendaSmartKind = "checkup_180" | "upgrade_365";

export interface PosVendaSmartBadge {
  kind: PosVendaSmartKind;
  label: string;
  description: string;
  pulse?: boolean;
}

export interface PosVendaCard {
  id: string;
  sourceKey: string;
  columnId: PosVendaColumnId;
  vendaId: string | null;
  cliente: string;
  telefone: string;
  veiculo: string;
  tarefa: string;
  prazo: string;
  prazoTone: PosVendaTone;
  vendedor: string;
  vendedorIniciais: string;
  origem: PosVendaOrigem;
  statusResumo: string;
  statusTone: PosVendaTone;
  mensagemZap: string;
  ordem: number;
  historicoSaudeCount: number;
  lastHealthInteractionAt: string | null;
  smartBadge: PosVendaSmartBadge | null;
}

export interface CreatePosVendaCardInput {
  cliente: string;
  telefone: string;
  veiculo: string;
  tarefa: string;
  vendedor: string;
  columnId: PosVendaColumnId;
}
