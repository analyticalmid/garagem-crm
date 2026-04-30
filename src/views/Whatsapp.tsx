import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, dataUrl } from "@/lib/api";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { LeadSidebar } from "@/components/whatsapp/LeadSidebar";
import type { LeadStatus } from "@/types/lead";
import { humanizeColumnKey } from "@/lib/kanbanColumns";
import type { PipelineColumn } from "@/lib/kanbanColumns";

export interface WhatsappConversation {
  id: string;
  telefone: string;
  lead_id: number | null;
  lead_nome: string | null;
  nao_lidas: number;
  status: string;
  ultima_mensagem_at: string | null;
  ultima_mensagem_preview?: string | null;
  lead_kanban_status: string;
  veiculo_interesse: string | null;
  observacao: string | null;
  responsavel_id: string | null;
  assigned_user_name?: string | null;
}

export interface WhatsappMessage {
  id: string;
  conversation_id: string;
  conteudo: string | null;
  created_at: string;
  enviada_pelo_agente: boolean;
  sender: string;
  telefone: string;
  tipo: string;
  tipo_midia: string | null;
  url_midia: string | null;
}

export default function Whatsapp() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: conversations = [], isLoading: isLoadingConvs, error: conversationsError } = useQuery<WhatsappConversation[]>({
    queryKey: ["whatsapp-conversations"],
    queryFn: () => apiFetch(dataUrl("whatsapp-conversations")),
    refetchInterval: 12_000,
  });
  const { data: leadColumns = [] } = useQuery<PipelineColumn[]>({
    queryKey: ["pipeline-columns", "leads"],
    queryFn: () => apiFetch(dataUrl("pipeline-columns", { pipeline: "leads" })),
    staleTime: 60_000,
  });

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<WhatsappMessage[]>({
    queryKey: ["whatsapp-messages", selectedConv?.telefone],
    queryFn: () => apiFetch(dataUrl("whatsapp-messages", { telefone: selectedConv!.telefone })),
    enabled: !!selectedConv?.telefone,
    refetchInterval: 6_000,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ text, telefone, nomeLead }: { text: string; telefone: string; nomeLead: string | null }) => {
      await apiFetch(dataUrl("whatsapp-send-message"), {
        method: "POST",
        body: { conteudo: text, telefone, nomeLead },
      });
    },
    onMutate: async ({ text, telefone }) => {
      const messageKey = ["whatsapp-messages", telefone] as const;
      const conversationKey = ["whatsapp-conversations"] as const;

      await queryClient.cancelQueries({ queryKey: messageKey });
      const previousMessages = queryClient.getQueryData<WhatsappMessage[]>(messageKey) ?? [];
      const optimisticId = `temp-${crypto.randomUUID()}`;
      const optimisticMessage: WhatsappMessage = {
        id: optimisticId,
        conversation_id: selectedConv?.id ?? telefone,
        conteudo: text,
        created_at: new Date().toISOString(),
        enviada_pelo_agente: true,
        sender: "agente",
        telefone,
        tipo: "text",
        tipo_midia: null,
        url_midia: null,
      };

      queryClient.setQueryData<WhatsappMessage[]>(messageKey, [...previousMessages, optimisticMessage]);
      queryClient.setQueryData<WhatsappConversation[]>(conversationKey, (old) =>
        old?.map((conversation) =>
          conversation.telefone === telefone
            ? {
                ...conversation,
                ultima_mensagem_at: optimisticMessage.created_at,
                ultima_mensagem_preview: text,
              }
            : conversation,
        ) ?? [],
      );

      return { previousMessages, messageKey, optimisticId };
    },
    onSuccess: (_data, _variables, context) => {
      if (context) {
        queryClient.setQueryData<WhatsappMessage[]>(context.messageKey, (current) =>
          (current ?? []).filter((message) => message.id !== context.optimisticId),
        );
      }
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", selectedConv?.telefone] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
    onError: (err, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.messageKey, context.previousMessages);
      }
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      toast.error(err instanceof Error ? err.message : "Falha ao enviar mensagem");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ telefone, status }: { telefone: string; status: LeadStatus }) => {
      await apiFetch(dataUrl("lead-status"), {
        method: "PATCH",
        body: { telefone, status },
      });
    },
    onSuccess: (_, { status }) => {
      const label = humanizeColumnKey(status);
      toast.success(`Lead movido para "${label}"`);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
    },
    onError: () => {
      toast.error("Falha ao atualizar etapa");
    },
  });

  const leadMutation = useMutation({
    mutationFn: async ({
      id,
      telefone,
      nome,
      observacao,
    }: {
      id?: number;
      telefone?: string;
      nome?: string | null;
      observacao?: string | null;
    }) => {
      const body = Object.fromEntries(
        Object.entries({ id, telefone, nome, observacao }).filter(([, value]) => value !== undefined),
      );

      await apiFetch(dataUrl("lead"), {
        method: "PATCH",
        body,
      });
    },
    onSuccess: () => {
      toast.success("Lead atualizado");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
    },
    onError: () => {
      toast.error("Falha ao salvar lead");
    },
  });

  const handleSendMessage = (text: string) => {
    if (!selectedConv) return;
    sendMutation.mutate({
      text,
      telefone: selectedConv.telefone,
      nomeLead: selectedConv.lead_nome,
    });
  };

  const handleStatusChange = async (telefone: string, newStatus: LeadStatus) => {
    await statusMutation.mutateAsync({ telefone, status: newStatus });
  };

  const handleLeadUpdate = async ({
    id,
    telefone,
    nome,
    observacao,
  }: {
    id?: number;
    telefone?: string;
    nome?: string | null;
    observacao?: string | null;
  }) => {
    await leadMutation.mutateAsync({ id, telefone, nome, observacao });
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    // Mark conversation as read locally
    queryClient.setQueryData<WhatsappConversation[]>(["whatsapp-conversations"], (old) =>
      old?.map((c) => (c.id === id ? { ...c, nao_lidas: 0 } : c)) ?? [],
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <WhatsAppIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight text-foreground tracking-tight">WhatsApp</h1>
          <p className="text-xs text-muted-foreground">
            {conversationsError
              ? "Não foi possível carregar as conversas"
              : isLoadingConvs
                ? "Carregando..."
                : conversations.length > 0
                  ? `${conversations.length} conversa${conversations.length !== 1 ? "s" : ""}`
                  : "Nenhuma conversa encontrada"}
          </p>
        </div>
      </div>

      {/* Main panel */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.05] bg-black/10">
        {/* Left: conversation list */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          search={search}
          onSearchChange={setSearch}
          isLoading={isLoadingConvs}
        />

        {/* Center: chat or empty state */}
        {selectedConv ? (
          <ChatWindow
            conversation={selectedConv}
            columns={leadColumns}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            onSendMessage={handleSendMessage}
            isSending={sendMutation.isPending}
          />
        ) : (
          <EmptyChat />
        )}

        {/* Right: lead sidebar */}
        {selectedConv && (
          <LeadSidebar
            key={selectedConv.id}
            conversation={selectedConv}
            columns={leadColumns}
            onStatusChange={handleStatusChange}
            onLeadUpdate={handleLeadUpdate}
            isSavingLead={leadMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500/40">
        <WhatsAppIcon className="h-8 w-8" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/60">Selecione uma conversa</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Escolha um contato à esquerda para ver o histórico
        </p>
      </div>
    </div>
  );
}
