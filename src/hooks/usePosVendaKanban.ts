import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Database, Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import { useLeadsKanban } from "@/hooks/useLeadsKanban";
import { apiFetch, dataUrl } from "@/lib/api";
import type {
  CreatePosVendaCardInput,
  PosVendaCard,
  PosVendaColumnId,
  PosVendaOrigem,
  PosVendaSmartBadge,
  PosVendaSmartKind,
  PosVendaTone,
} from "@/types/posVenda";

type PosVendaRow = Tables<"pos_venda_cards">;
type PosVendaInsert = TablesInsert<"pos_venda_cards">;
type PosVendaOpportunityRow = Database["public"]["Views"]["view_oportunidades_pos_venda"]["Row"];

type SmartCardMetadata = {
  smartKind?: PosVendaSmartKind;
  smartLabel?: string;
  smartDescription?: string;
  pulse?: boolean;
  historyCount?: number;
  lastInteractionAt?: string | null;
};

function getInitials(value: string) {
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "PV"
  );
}

function mapOrigem(origem: string): PosVendaOrigem {
  return origem === "automatico" ? "Automático" : "Manual";
}

function mapTone(value: string | null | undefined): PosVendaTone {
  if (value === "azul" || value === "verde" || value === "amarelo" || value === "vermelho") {
    return value;
  }

  return "neutro";
}

function isRecord(value: Json | null | undefined): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asHistoryEntries(value: Json | null | undefined) {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, Json> => isRecord(entry)) : [];
}

function getSmartBadge(metadata: Json | null | undefined): PosVendaSmartBadge | null {
  if (!isRecord(metadata)) return null;

  const kind = metadata.smartKind;
  const label = metadata.smartLabel;
  const description = metadata.smartDescription;

  if (
    (kind === "checkup_180" || kind === "upgrade_365") &&
    typeof label === "string" &&
    typeof description === "string"
  ) {
    return {
      kind,
      label,
      description,
      pulse: metadata.pulse === true,
    };
  }

  return null;
}

function getMetadataInfo(metadata: Json | null | undefined) {
  if (!isRecord(metadata)) {
    return {
      historyCount: 0,
      lastInteractionAt: null,
    };
  }

  return {
    historyCount: typeof metadata.historyCount === "number" ? metadata.historyCount : 0,
    lastInteractionAt: typeof metadata.lastInteractionAt === "string" ? metadata.lastInteractionAt : null,
  };
}

function mapRowToCard(row: PosVendaRow): PosVendaCard {
  const vendedor = row.responsavel_nome || "Equipe comercial";
  const smartBadge = getSmartBadge(row.metadata);
  const metadataInfo = getMetadataInfo(row.metadata);

  return {
    id: row.id,
    sourceKey: row.source_key,
    columnId: row.etapa as PosVendaColumnId,
    vendaId: row.venda_id,
    cliente: row.cliente_nome,
    telefone: row.telefone,
    veiculo: row.veiculo_nome,
    tarefa: row.proxima_acao,
    prazo: row.prazo_label,
    prazoTone: mapTone(row.prazo_tone),
    vendedor,
    vendedorIniciais: getInitials(vendedor),
    origem: mapOrigem(row.origem),
    statusResumo: row.status_resumo,
    statusTone: mapTone(row.status_tone),
    mensagemZap: row.mensagem_zap,
    ordem: row.ordem,
    historicoSaudeCount: metadataInfo.historyCount,
    lastHealthInteractionAt: metadataInfo.lastInteractionAt,
    smartBadge,
  };
}

function buildLeadFlowCard(lead: {
  id: number;
  nome: string | null;
  telefone: string | null;
  leadType?: string | null;
  assigned_to: string | null;
  assignedUserName?: string | null;
}): PosVendaInsert | null {
  if (!lead.telefone) {
    return null;
  }

  const cliente = lead.nome || "Cliente sem nome";
  const vendedor = lead.assignedUserName || "Equipe comercial";

  return {
    source_key: `lead:${lead.id}`,
    origem: "automatico",
    lead_id: lead.id,
    telefone: lead.telefone,
    cliente_nome: cliente,
    veiculo_nome: lead.leadType || "Veículo vendido",
    proxima_acao: "Aguardando preparação para entrega.",
    etapa: "venda_realizada",
    status_resumo: "Sincronizado da venda",
    status_tone: "azul",
    prazo_label: "Hoje",
    prazo_tone: "azul",
    mensagem_zap: `Olá, ${cliente}. Sua venda entrou no fluxo de pós-venda e vou te atualizar sobre a preparação de entrega.`,
    responsavel_id: lead.assigned_to,
    responsavel_nome: vendedor,
    ordem: 0,
  };
}

function buildOpportunityMessage(kind: PosVendaSmartKind, cliente: string, veiculo: string) {
  if (kind === "upgrade_365") {
    return `Olá, ${cliente}. Seu ${veiculo} completou 1 ano com a gente e preparei uma condição especial de troca para você avaliar sem compromisso.`;
  }

  return `Olá, ${cliente}. Seu ${veiculo} está entrando na janela ideal de 6 meses para um check-up preventivo. Posso te enviar as opções de agenda?`;
}

function buildOpportunityCard(opportunity: PosVendaOpportunityRow): PosVendaInsert | null {
  if (!opportunity.venda_id || !opportunity.comprador_telefone) {
    return null;
  }

  const smartKind =
    opportunity.oportunidade_kind === "upgrade_365" ? "upgrade_365" : opportunity.oportunidade_kind === "checkup_180" ? "checkup_180" : null;

  if (!smartKind) {
    return null;
  }

  const history = asHistoryEntries(opportunity.historico_saude);
  const lastHistory = history.at(-1);
  const cliente = opportunity.nome_cliente || opportunity.comprador_nome || "Cliente";
  const veiculo = opportunity.veiculo_nome || opportunity.modelo_veiculo || "veículo";

  return {
    source_key: `sale:${opportunity.venda_id}:${smartKind}`,
    origem: "automatico",
    venda_id: opportunity.venda_id,
    telefone: opportunity.comprador_telefone,
    cliente_nome: cliente,
    veiculo_nome: veiculo,
    proxima_acao:
      smartKind === "upgrade_365"
        ? "Apresentar condição de troca e reavaliar intenção de upgrade."
        : "Oferecer check-up preventivo e reforçar relacionamento.",
    etapa:
      (opportunity.suggested_column_id as PosVendaColumnId | null) ||
      (smartKind === "upgrade_365" ? "oferta_recompra" : "followup_satisfacao"),
    status_resumo: smartKind === "upgrade_365" ? "Oferta de troca pronta" : "Check-up recomendado",
    status_tone: smartKind === "upgrade_365" ? "amarelo" : "azul",
    prazo_label: opportunity.prazo_label || (smartKind === "upgrade_365" ? "1 ano" : "6 meses"),
    prazo_tone: smartKind === "upgrade_365" ? "vermelho" : "azul",
    mensagem_zap: opportunity.mensagem_sugerida || buildOpportunityMessage(smartKind, cliente, veiculo),
    responsavel_nome: "Pós-venda inteligente",
    ordem: 0,
    metadata: {
      smartKind,
      smartLabel:
        smartKind === "upgrade_365" ? "🔥 1 Ano: Oferta de Troca" : "🕒 6 Meses: Check-up",
      smartDescription:
        smartKind === "upgrade_365"
          ? "Cliente na janela ideal de renovação."
          : "Momento recomendado para contato preventivo.",
      pulse: smartKind === "upgrade_365",
      historyCount: history.length,
      lastInteractionAt:
        lastHistory && typeof lastHistory.data === "string"
          ? lastHistory.data
          : lastHistory && typeof lastHistory.created_at === "string"
            ? lastHistory.created_at
            : null,
    } satisfies SmartCardMetadata,
  };
}

export function usePosVendaKanban() {
  const queryClient = useQueryClient();
  const { user, canViewAllLeads } = useAuth();
  const { leadsByStatus, isLoading: leadsLoading } = useLeadsKanban();

  const { data: rows = [], isLoading: cardsLoading, error } = useQuery({
    queryKey: ["pos-venda-cards", user?.id, canViewAllLeads],
    enabled: !!user,
    queryFn: async () => apiFetch<PosVendaRow[]>(dataUrl("pos-venda-cards")),
  });

  const { data: opportunities = [], isLoading: opportunitiesLoading } = useQuery({
    queryKey: ["pos-venda-oportunidades", user?.id, canViewAllLeads],
    enabled: !!user,
    queryFn: async () => apiFetch<PosVendaOpportunityRow[]>(dataUrl("pos-venda-oportunidades")),
  });

  const syncAutomaticCardsMutation = useMutation({
    mutationFn: async (cardsToInsert: PosVendaInsert[]) => {
      if (cardsToInsert.length === 0) return;
      await apiFetch(dataUrl("pos-venda-cards"), { method: "POST", body: { cards: cardsToInsert } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-venda-cards"] });
    },
    onError: () => {
      toast.error("Erro ao sincronizar oportunidades automáticas do pós-venda");
    },
  });

  useEffect(() => {
    if (!user || leadsLoading || cardsLoading || opportunitiesLoading || syncAutomaticCardsMutation.isPending) {
      return;
    }

    const existingSourceKeys = new Set(rows.map((row) => row.source_key));
    const missingLeadFlowCards = leadsByStatus.vendido
      .map(buildLeadFlowCard)
      .filter((card): card is PosVendaInsert => Boolean(card))
      .filter((card) => !existingSourceKeys.has(card.source_key));

    const missingSmartCards = opportunities
      .map(buildOpportunityCard)
      .filter((card): card is PosVendaInsert => Boolean(card))
      .filter((card) => !existingSourceKeys.has(card.source_key));

    const missingCards = [...missingLeadFlowCards, ...missingSmartCards];

    if (missingCards.length > 0) {
      syncAutomaticCardsMutation.mutate(missingCards);
    }
  }, [
    rows,
    user,
    leadsLoading,
    cardsLoading,
    opportunitiesLoading,
    leadsByStatus.vendido,
    opportunities,
    syncAutomaticCardsMutation,
  ]);

  const updateStageMutation = useMutation({
    mutationFn: async ({ cardId, columnId, ordem }: { cardId: string; columnId: PosVendaColumnId; ordem: number }) => {
      await apiFetch(dataUrl("pos-venda-stage"), { method: "PATCH", body: { id: cardId, etapa: columnId, ordem } });
    },
    onMutate: async ({ cardId, columnId, ordem }) => {
      const queryKey = ["pos-venda-cards", user?.id, canViewAllLeads] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData<PosVendaRow[]>(queryKey);

      queryClient.setQueryData<PosVendaRow[]>(queryKey, (current) => {
        if (!current) return current;
        return current.map((row) => (row.id === cardId ? { ...row, etapa: columnId, ordem } : row));
      });

      return { previousRows, queryKey };
    },
    onError: (_mutationError, _variables, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(context.queryKey, context.previousRows);
      }
      toast.error("Erro ao mover card do pós-venda");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-venda-cards"] });
    },
  });

  const createCardMutation = useMutation({
    mutationFn: async (input: CreatePosVendaCardInput) => {
      const payload: PosVendaInsert = {
        source_key: `manual:${crypto.randomUUID()}`,
        origem: "manual",
        telefone: input.telefone,
        cliente_nome: input.cliente,
        veiculo_nome: input.veiculo,
        proxima_acao: input.tarefa,
        etapa: input.columnId,
        status_resumo: "Ação criada",
        status_tone: "azul",
        prazo_label: "Hoje",
        prazo_tone: "azul",
        mensagem_zap: `Olá, ${input.cliente}. Segui com uma ação do nosso pós-venda referente a ${input.veiculo}. ${input.tarefa}`,
        responsavel_id: user?.id || null,
        responsavel_nome: input.vendedor,
        ordem: 0,
      };

      await apiFetch(dataUrl("pos-venda-card"), { method: "POST", body: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-venda-cards"] });
      toast.success("Ação de pós-venda criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar ação de pós-venda");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (card: PosVendaCard) => {
      await apiFetch<{ ok: true }>(dataUrl("pos-venda-send-message"), {
        method: "POST",
        body: {
          cardId: card.id,
          vendaId: card.vendaId,
          telefone: card.telefone,
          conteudo: card.mensagemZap,
          nomeLead: card.cliente,
          veiculo: card.veiculo,
          smartKind: card.smartBadge?.kind || null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-venda-cards"] });
      queryClient.invalidateQueries({ queryKey: ["pos-venda-oportunidades"] });
      toast.success("Mensagem registrada no histórico de saúde do cliente.");
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem do pós-venda");
    },
  });

  const cards = useMemo(() => rows.map(mapRowToCard), [rows]);
  const automaticCardsCount = useMemo(() => cards.filter((card) => card.origem === "Automático").length, [cards]);
  const smartCardsCount = useMemo(() => cards.filter((card) => card.smartBadge).length, [cards]);

  return {
    cards,
    automaticCardsCount,
    smartCardsCount,
    soldLeadsCount: leadsByStatus.vendido.length,
    isLoading: cardsLoading || leadsLoading || opportunitiesLoading,
    error,
    createCard: createCardMutation.mutateAsync,
    moveCard: updateStageMutation.mutate,
    sendMessage: sendMessageMutation.mutateAsync,
    sendingCardId: sendMessageMutation.variables?.id || null,
    isSaving:
      updateStageMutation.isPending ||
      createCardMutation.isPending ||
      syncAutomaticCardsMutation.isPending ||
      sendMessageMutation.isPending,
  };
}
