export type PosVendaColumnId = "venda_realizada" | "checklist_entrega" | "followup_satisfacao" | "oferta_recompra";

export type PosVendaTone = "azul" | "verde" | "amarelo" | "vermelho" | "neutro";

export type PosVendaOrigem = "Automático" | "Manual";

export interface PosVendaCard {
  id: string;
  sourceKey: string;
  columnId: PosVendaColumnId;
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
}

export interface CreatePosVendaCardInput {
  cliente: string;
  telefone: string;
  veiculo: string;
  tarefa: string;
  vendedor: string;
  columnId: PosVendaColumnId;
}