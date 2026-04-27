import { useDeferredValue, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import type { LucideIcon } from "lucide-react";
import { CircleDot, KeyRound, Loader2, Plus, Repeat2, Search, ShieldCheck, Stars } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePosVendaKanban } from "@/hooks/usePosVendaKanban";
import { cn, formatBrazilianPhone } from "@/lib/utils";
import type { PosVendaCard, PosVendaColumnId, PosVendaTone } from "@/types/posVenda";

type KpiItem = {
  titulo: string;
  valor: string;
  subtitulo: string;
  icon: LucideIcon;
  valorClassName?: string;
  iconClassName?: string;
};

const columns: Array<{
  id: PosVendaColumnId;
  title: string;
  eyebrow: string;
  description: string;
  dotClassName: string;
}> = [
  {
    id: "venda_realizada",
    title: "Venda Realizada",
    eyebrow: "Entrada de Venda (Automático)",
    description: "Novas vendas fechadas iniciam o fluxo de pós-venda aqui.",
    dotClassName: "bg-[#3B82F6] shadow-[0_0_0_4px_rgba(59,130,246,0.14)]",
  },
  {
    id: "checklist_entrega",
    title: "Checklist de Entrega",
    eyebrow: "Processo de Revisão e Entrega",
    description: "Conferência de documentação, acessórios, manual e chaves.",
    dotClassName: "bg-[#F59E0B] shadow-[0_0_0_4px_rgba(245,158,11,0.14)]",
  },
  {
    id: "followup_satisfacao",
    title: "Follow-up de Satisfação",
    eyebrow: "Réguas de 7 e 30 dias",
    description: "Contato pós-entrega para medir satisfação e retenção.",
    dotClassName: "bg-[#10B981] shadow-[0_0_0_4px_rgba(16,185,129,0.14)]",
  },
  {
    id: "oferta_recompra",
    title: "Oferta de Recompra",
    eyebrow: "Janelas de Troca",
    description: "Ações de recompra e renovação entre 1 e 2 anos.",
    dotClassName: "bg-[#FACC15] shadow-[0_0_0_4px_rgba(250,204,21,0.14)]",
  },
];

function PosVendaCycleIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      <Repeat2 className="h-full w-full" strokeWidth={1.9} />
      <KeyRound className="absolute -bottom-[2px] -right-[3px] h-[58%] w-[58%] rounded-full bg-[#0A0E17] p-[1px]" strokeWidth={2.1} />
    </span>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M19.05 4.94A9.93 9.93 0 0 0 12.02 2C6.5 2 2 6.48 2 12c0 1.77.46 3.5 1.35 5.03L2 22l5.1-1.33A10 10 0 0 0 12.02 22h.01C17.55 22 22 17.52 22 12a9.93 9.93 0 0 0-2.95-7.06Zm-7.03 15.37h-.01a8.28 8.28 0 0 1-4.22-1.15l-.3-.18-3.03.79.81-2.95-.2-.31A8.25 8.25 0 1 1 20.3 12c0 4.58-3.72 8.31-8.28 8.31Zm4.54-6.2c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.57.12-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.2-.73-.66-1.23-1.47-1.37-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.57-1.36-.78-1.86-.2-.49-.41-.42-.57-.43h-.49c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.02 2.61c.12.17 1.77 2.71 4.29 3.79.6.26 1.07.41 1.44.52.61.2 1.17.17 1.61.1.49-.07 1.48-.61 1.69-1.2.21-.59.21-1.09.15-1.2-.06-.12-.23-.19-.48-.31Z" />
    </svg>
  );
}

function toneToTextClass(tone: PosVendaTone) {
  switch (tone) {
    case "azul":
      return "text-blue-300";
    case "verde":
      return "text-emerald-300";
    case "amarelo":
      return "text-amber-300";
    case "vermelho":
      return "text-red-300";
    default:
      return "text-slate-300";
  }
}

function toneToBadgeClass(tone: PosVendaTone) {
  switch (tone) {
    case "azul":
      return "text-blue-300 bg-blue-500/10 border-blue-400/20";
    case "verde":
      return "text-emerald-300 bg-emerald-500/10 border-emerald-400/20";
    case "amarelo":
      return "text-amber-300 bg-amber-500/10 border-amber-400/20";
    case "vermelho":
      return "text-red-300 bg-red-500/10 border-red-400/20";
    default:
      return "text-slate-300 bg-white/[0.04] border-white/[0.08]";
  }
}

function getWhatsappLink(telefone: string, mensagem: string) {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

function formatHealthDate(value: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function PosVendaCardItem({
  card,
  index,
  isSending,
  onSendMessage,
}: {
  card: PosVendaCard;
  index: number;
  isSending: boolean;
  onSendMessage: (card: PosVendaCard) => Promise<void>;
}) {
  const lastHealthDate = formatHealthDate(card.lastHealthInteractionAt);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={cn(
            "group rounded-[22px] border border-white/[0.06] bg-[#141A26] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.24)] transition-all duration-200",
            snapshot.isDragging ? "scale-[1.02] border-blue-500/30 shadow-[0_18px_40px_rgba(59,130,246,0.16)]" : "hover:-translate-y-0.5 hover:border-white/[0.12]",
          )}
        >
          <div className="flex h-full flex-col gap-3.5">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 shrink-0 ring-1 ring-white/10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500/28 to-slate-700 text-xs font-semibold text-blue-100">
                  {card.vendedorIniciais}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-foreground">{card.cliente}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{formatBrazilianPhone(card.telefone)}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium", toneToTextClass(card.prazoTone), card.prazoTone === "vermelho" ? "bg-red-500/10" : "bg-white/[0.04]") }>
                    {card.prazo}
                  </span>
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Responsável: {card.vendedor}</p>
              </div>
            </div>

            <div className="space-y-3 pl-14">
              {card.smartBadge ? (
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
                    card.smartBadge.kind === "upgrade_365"
                      ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                      : "border-blue-400/20 bg-blue-500/10 text-blue-200",
                  )}
                >
                  {card.smartBadge.pulse ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300/75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" />
                    </span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-300" />
                  )}
                  {card.smartBadge.label}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
                    toneToBadgeClass(card.statusTone),
                  )}
                >
                  {card.smartBadge?.pulse ? (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300/70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
                    </span>
                  ) : null}
                  {card.statusResumo}
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-300">
                  {card.origem}
                </span>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Veículo</p>
                <p className="mt-1 text-sm font-medium leading-5 text-foreground">{card.veiculo}</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/10 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Próxima ação</p>
                <p className="mt-1 text-sm leading-5 text-slate-200">{card.tarefa}</p>
              </div>

              <Button
                variant="ghost"
                onClick={() => void onSendMessage(card)}
                disabled={isSending}
                className="h-11 w-full justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-slate-100 hover:border-[#25D366]/30 hover:bg-[#25D366]/10 hover:text-white disabled:opacity-70"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin text-[#25D366]" /> : <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />}
                {isSending ? "Enviando..." : "Enviar Mensagem"}
              </Button>

              <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-muted-foreground">
                <span>Histórico de saúde: {card.historicoSaudeCount}</span>
                <span>{lastHealthDate ? `Último contato em ${lastHealthDate}` : "Sem contatos registrados"}</span>
              </div>

              <a
                href={getWhatsappLink(card.telefone, card.mensagemZap)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl text-xs text-blue-200/80 transition hover:text-blue-100"
              >
                Abrir prévia no WhatsApp
              </a>
            </div>
          </div>
        </article>
      )}
    </Draggable>
  );
}

function PosVendaColumn({
  id,
  title,
  eyebrow,
  description,
  dotClassName,
  cards,
  sendingCardId,
  onSendMessage,
}: {
  id: PosVendaColumnId;
  title: string;
  eyebrow: string;
  description: string;
  dotClassName: string;
  cards: PosVendaCard[];
  sendingCardId: string | null;
  onSendMessage: (card: PosVendaCard) => Promise<void>;
}) {
  return (
    <div className="flex h-full min-h-[700px] w-[356px] min-w-[356px] shrink-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(20,26,38,0.98),rgba(10,14,23,0.98))]">
      <div className="shrink-0 border-b border-white/[0.05] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", dotClassName)} />
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
            {cards.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-4 pr-2 transition-colors duration-200",
              "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20",
              snapshot.isDraggingOver && "bg-blue-500/[0.04]",
            )}
          >
            {cards.map((card, index) => (
              <PosVendaCardItem
                key={card.id}
                card={card}
                index={index}
                isSending={sendingCardId === card.id}
                onSendMessage={onSendMessage}
              />
            ))}
            {provided.placeholder}

            {cards.length === 0 && !snapshot.isDraggingOver ? (
              <div className="flex h-32 items-center justify-center rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] text-center text-xs text-muted-foreground">
                Nenhuma ação nesta etapa.
              </div>
            ) : null}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function PosVenda() {
  const {
    cards,
    automaticCardsCount,
    smartCardsCount,
    soldLeadsCount,
    isLoading,
    createCard,
    moveCard,
    sendMessage,
    sendingCardId,
    isSaving,
  } = usePosVendaKanban();
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoCliente, setNovoCliente] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoVeiculo, setNovoVeiculo] = useState("");
  const [novaTarefa, setNovaTarefa] = useState("");
  const [novoVendedor, setNovoVendedor] = useState("");
  const [novaColuna, setNovaColuna] = useState<PosVendaColumnId>("checklist_entrega");

  const filteredCards = useMemo(() => {
    const search = deferredSearchTerm.trim().toLowerCase();
    if (!search) return cards;

    return cards.filter((card) => `${card.cliente} ${card.veiculo}`.toLowerCase().includes(search));
  }, [cards, deferredSearchTerm]);

  const cardsByColumn = useMemo(() => {
    return filteredCards.reduce<Record<PosVendaColumnId, PosVendaCard[]>>(
      (accumulator, card) => {
        accumulator[card.columnId].push(card);
        return accumulator;
      },
      {
        venda_realizada: [],
        checklist_entrega: [],
        followup_satisfacao: [],
        oferta_recompra: [],
      },
    );
  }, [filteredCards]);

  const feedbackCount = cardsByColumn.followup_satisfacao.length;
  const criticalCount = filteredCards.filter((card) => card.prazoTone === "vermelho").length;

  const kpis: KpiItem[] = [
    {
      titulo: "Clientes p/ Feedback",
      valor: String(feedbackCount),
      subtitulo: "Feedback pendente nas réguas de pós-entrega.",
      icon: ShieldCheck,
      iconClassName: "text-blue-300",
    },
    {
      titulo: "Ações Críticas",
      valor: String(criticalCount),
      subtitulo: "Atividades vencidas que exigem contato.",
      icon: CircleDot,
      valorClassName: "text-red-300",
      iconClassName: "text-red-300",
    },
    {
      titulo: "NPS Geral",
      valor: "88",
      subtitulo: "+2 pts vs. mês passado.",
      icon: Stars,
      valorClassName: "text-emerald-300",
      iconClassName: "text-emerald-300",
    },
  ];

  const handleDragEnd = ({ destination, source, draggableId }: DropResult) => {
    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    moveCard({
      cardId: draggableId,
      columnId: destination.droppableId as PosVendaColumnId,
      ordem: destination.index,
    });
  };

  const handleCreateManualAction = async () => {
    if (!novoCliente.trim() || !novoTelefone.trim() || !novoVeiculo.trim() || !novaTarefa.trim() || !novoVendedor.trim()) {
      return;
    }

    await createCard({
      cliente: novoCliente.trim(),
      telefone: novoTelefone.trim(),
      veiculo: novoVeiculo.trim(),
      tarefa: novaTarefa.trim(),
      vendedor: novoVendedor.trim(),
      columnId: novaColuna,
    });

    setNovoCliente("");
    setNovoTelefone("");
    setNovoVeiculo("");
    setNovaTarefa("");
    setNovoVendedor("");
    setNovaColuna("checklist_entrega");
    setIsDialogOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pr-1 pb-4">
      <section className="space-y-5 rounded-[30px] border border-white/[0.06] bg-[#0A0E17] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] lg:p-7">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-200/85">
              <PosVendaCycleIcon className="h-3.5 w-3.5 text-blue-300" />
              Retenção e Recompra
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Dashboard de Pós-Venda</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Operação diária de entrega, satisfação e retenção agora conectada ao Supabase com persistência de etapas.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
            {isLoading ? (
              <span className="inline-flex items-center gap-2 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
                Sincronizando cards do pós-venda...
              </span>
            ) : (
                <span>
                {automaticCardsCount > 0
                  ? `${automaticCardsCount} card(s) automáticos sincronizados, com ${smartCardsCount} oportunidade(s) inteligentes ativas.`
                  : soldLeadsCount > 0
                    ? `Há ${soldLeadsCount} venda(s) elegíveis aguardando sincronização.`
                    : "Nenhuma venda marcada como vendida para iniciar o fluxo."}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {kpis.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.titulo} className="rounded-[24px] border border-white/[0.06] bg-[#141A26] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.titulo}</p>
                    <p className={cn("mt-4 text-3xl font-semibold tracking-tight tabular-nums text-foreground", item.valorClassName)}>{item.valor}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{item.subtitulo}</p>
                  </div>
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04]", item.iconClassName)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex min-h-[820px] flex-none flex-col rounded-[30px] border border-white/[0.06] bg-[#141A26] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] lg:p-6">
        <div className="flex shrink-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Pipeline de Pós-Venda e Retenção</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Todas as etapas do kanban são persistidas no Supabase, incluindo histórico de saúde e oportunidades de retenção.
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:max-w-[38rem]">
            <div className="relative w-full sm:max-w-sm xl:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por cliente ou veículo..."
                className="h-10 rounded-xl border-white/[0.06] bg-white/[0.03] pl-10 focus-visible:border-primary/30 focus-visible:ring-primary/20"
              />
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 rounded-xl border-0 bg-gradient-to-r from-primary to-blue-400 px-4 hover:shadow-lg hover:shadow-primary/20 transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Ação Manual
                </Button>
              </DialogTrigger>
              <DialogContent className="border-white/[0.06] bg-card sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nova Ação Manual</DialogTitle>
                  <DialogDescription>
                    Crie uma ação operacional que já nasce persistida na tabela de pós-venda.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="cliente">Cliente</Label>
                    <Input id="cliente" value={novoCliente} onChange={(event) => setNovoCliente(event.target.value)} className="rounded-xl bg-white/[0.04] border-white/[0.08]" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" value={novoTelefone} onChange={(event) => setNovoTelefone(event.target.value)} className="rounded-xl bg-white/[0.04] border-white/[0.08]" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vendedor">Responsável</Label>
                      <Input id="vendedor" value={novoVendedor} onChange={(event) => setNovoVendedor(event.target.value)} className="rounded-xl bg-white/[0.04] border-white/[0.08]" />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="veiculo">Veículo</Label>
                      <Input id="veiculo" value={novoVeiculo} onChange={(event) => setNovoVeiculo(event.target.value)} className="rounded-xl bg-white/[0.04] border-white/[0.08]" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="coluna">Etapa</Label>
                      <select
                        id="coluna"
                        value={novaColuna}
                        onChange={(event) => setNovaColuna(event.target.value as PosVendaColumnId)}
                        className="flex h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-foreground outline-none focus:border-primary/30"
                      >
                        {columns.map((column) => (
                          <option key={column.id} value={column.id} className="bg-slate-900">
                            {column.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tarefa">Tarefa</Label>
                    <Input id="tarefa" value={novaTarefa} onChange={(event) => setNovaTarefa(event.target.value)} className="rounded-xl bg-white/[0.04] border-white/[0.08]" />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]">
                    Cancelar
                  </Button>
                  <Button type="button" disabled={isSaving} onClick={() => void handleCreateManualAction()} className="rounded-xl border-0 bg-gradient-to-r from-primary to-blue-400">
                    {isSaving ? "Salvando..." : "Criar Ação"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mt-5 h-[720px] min-h-[720px] overflow-hidden rounded-[28px] border border-white/[0.04] bg-black/10 max-lg:h-[680px] max-sm:h-[620px]">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="h-full overflow-x-auto overflow-y-hidden scroll-smooth px-1 pb-3 [scrollbar-gutter:stable]">
              <div className="flex h-full min-w-max flex-nowrap gap-5 items-stretch pr-1">
                {columns.map((column) => (
                  <PosVendaColumn
                    key={column.id}
                    id={column.id}
                    title={column.title}
                    eyebrow={column.eyebrow}
                    description={column.description}
                    dotClassName={column.dotClassName}
                    cards={cardsByColumn[column.id]}
                    sendingCardId={sendingCardId}
                    onSendMessage={sendMessage}
                  />
                ))}
              </div>
            </div>
          </DragDropContext>
        </div>
      </section>
    </div>
  );
}
