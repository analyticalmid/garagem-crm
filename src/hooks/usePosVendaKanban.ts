import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useLeadsKanban } from "@/hooks/useLeadsKanban";
import type { CreatePosVendaCardInput, PosVendaCard, PosVendaColumnId, PosVendaOrigem, PosVendaTone } from "@/types/posVenda";
import { apiFetch, dataUrl } from "@/lib/api";

type PosVendaRow = Tables<"pos_venda_cards">;
type PosVendaInsert = TablesInsert<"pos_venda_cards">;

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PV";
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

function mapRowToCard(row: PosVendaRow): PosVendaCard {
  const vendedor = row.responsavel_nome || "Equipe comercial";

  return {
    id: row.id,
    sourceKey: row.source_key,
    columnId: row.etapa as PosVendaColumnId,
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
  };
}

function buildAutomaticCard(lead: {
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

export function usePosVendaKanban() {
  const queryClient = useQueryClient();
  const { user, canViewAllLeads } = useAuth();
  const { leadsByStatus, isLoading: leadsLoading } = useLeadsKanban();

  const { data: rows = [], isLoading: cardsLoading, error } = useQuery({
    queryKey: ["pos-venda-cards", user?.id, canViewAllLeads],
    enabled: !!user,
    queryFn: async () => {
      return apiFetch<PosVendaRow[]>(dataUrl("pos-venda-cards"));
    },
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
      toast.error("Erro ao sincronizar vendas no pós-venda");
    },
  });

  useEffect(() => {
    if (!user || leadsLoading || cardsLoading || syncAutomaticCardsMutation.isPending) {
      return;
    }

    const existingSourceKeys = new Set(rows.map((row) => row.source_key));
    const missingCards = leadsByStatus.vendido
      .map(buildAutomaticCard)
      .filter((card): card is PosVendaInsert => Boolean(card))
      .filter((card) => !existingSourceKeys.has(card.source_key));

    if (missingCards.length > 0) {
      syncAutomaticCardsMutation.mutate(missingCards);
    }
  }, [rows, user, leadsLoading, cardsLoading, leadsByStatus.vendido, syncAutomaticCardsMutation]);

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

  const cards = useMemo(() => rows.map(mapRowToCard), [rows]);
  const automaticCardsCount = useMemo(() => cards.filter((card) => card.origem === "Automático").length, [cards]);

  return {
    cards,
    automaticCardsCount,
    soldLeadsCount: leadsByStatus.vendido.length,
    isLoading: cardsLoading || leadsLoading,
    error,
    createCard: createCardMutation.mutateAsync,
    moveCard: updateStageMutation.mutate,
    isSaving: updateStageMutation.isPending || createCardMutation.isPending || syncAutomaticCardsMutation.isPending,
  };
}
