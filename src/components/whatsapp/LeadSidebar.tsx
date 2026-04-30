import { useEffect, useState } from "react";
import { Check, ChevronDown, Phone, User, Car, FileText, Loader2, PencilLine, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KANBAN_COLUMNS, type LeadStatus } from "@/types/lead";
import type { PipelineColumn } from "@/lib/kanbanColumns";
import type { WhatsappConversation } from "@/views/Whatsapp";

const STAGE_STYLES: Record<string, { dot: string; badge: string }> = {
  novo_lead: {
    dot: "bg-kanban-novo",
    badge: "bg-kanban-novo/10 text-kanban-novo border-kanban-novo/20",
  },
  negociando: {
    dot: "bg-kanban-negociando",
    badge: "bg-kanban-negociando/10 text-kanban-negociando border-kanban-negociando/20",
  },
  vendido: {
    dot: "bg-kanban-vendido",
    badge: "bg-kanban-vendido/10 text-kanban-vendido border-kanban-vendido/20",
  },
  perdido: {
    dot: "bg-kanban-perdido",
    badge: "bg-kanban-perdido/10 text-kanban-perdido border-kanban-perdido/20",
  },
};

interface Props {
  conversation: WhatsappConversation;
  columns?: PipelineColumn[];
  onStatusChange: (telefone: string, newStatus: LeadStatus) => Promise<void>;
  onLeadUpdate: (payload: { id?: number; telefone?: string; nome?: string | null; observacao?: string | null }) => Promise<void>;
  isSavingLead: boolean;
}

export function LeadSidebar({ conversation, columns = [], onStatusChange, onLeadUpdate, isSavingLead }: Props) {
  const [isMoving, setIsMoving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftObservation, setDraftObservation] = useState("");
  const [localStatus, setLocalStatus] = useState<LeadStatus>(
    (conversation.lead_kanban_status as LeadStatus) || "novo_lead",
  );

  useEffect(() => {
    setDraftName(conversation.lead_nome || "");
    setDraftObservation(conversation.observacao || "");
    setIsEditingName(false);
  }, [conversation.id, conversation.lead_nome, conversation.observacao]);

  const phone = conversation.telefone?.replace("@s.whatsapp.net", "") || "";
  const name = conversation.lead_nome || conversation.telefone || "Sem nome";
  const styles = STAGE_STYLES[localStatus] || STAGE_STYLES.novo_lead;
  const currentLabel =
    columns.find((column) => column.key === localStatus)?.title ||
    KANBAN_COLUMNS.find((c) => c.id === localStatus)?.title ||
    localStatus;
  const availableColumns = columns.length > 0
    ? columns.map((column) => ({ id: column.key, title: column.title }))
    : KANBAN_COLUMNS;

  const handleStageChange = async (newStatus: LeadStatus) => {
    if (newStatus === localStatus || isMoving) return;
    setIsMoving(true);
    const previous = localStatus;
    setLocalStatus(newStatus);
    try {
      await onStatusChange(conversation.telefone, newStatus);
    } catch {
      setLocalStatus(previous);
    } finally {
      setIsMoving(false);
    }
  };

  const handleSaveLead = async () => {
    if (!conversation.telefone) return;

    await onLeadUpdate({
      telefone: conversation.telefone,
      nome: draftName.trim() || null,
    });
    setIsEditingName(false);
  };

  return (
    <div className="flex w-[260px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-white/[0.06] bg-black/20 px-4 py-5 [scrollbar-gutter:stable]">
      {/* Lead info */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          Lead
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Nome do lead"
                    className="h-9 rounded-xl border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-foreground"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleSaveLead}
                    disabled={!conversation.telefone || isSavingLead}
                    className="h-9 w-9 shrink-0 rounded-xl"
                  >
                    {isSavingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="truncate text-left text-sm font-semibold text-foreground transition hover:text-primary"
                >
                  {name}
                </button>
              )}
            </div>
            {!isEditingName && conversation.lead_id ? (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="mt-0.5 text-muted-foreground transition hover:text-foreground"
              >
                <PencilLine className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {phone && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{phone}</span>
            </div>
          )}
          <div className="mt-2.5 flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-medium",
                styles.badge,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
              {currentLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Observação
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <Textarea
            value={draftObservation}
            onChange={(e) => setDraftObservation(e.target.value)}
            placeholder="Adicionar observação sobre o lead..."
            className="min-h-[112px] resize-none rounded-xl border-white/[0.08] bg-white/[0.02] text-sm leading-relaxed text-foreground"
          />
          <Button
            type="button"
            onClick={() =>
              conversation.lead_id
                ? onLeadUpdate({
                    id: conversation.lead_id,
                    observacao: draftObservation.trim() || null,
                  })
                : Promise.resolve()
            }
            disabled={!conversation.lead_id || isSavingLead}
            className="mt-3 h-9 w-full rounded-xl"
          >
            {isSavingLead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Kanban stage mover */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Mover para etapa
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={isMoving}
              className="h-9 w-full justify-between rounded-xl border-white/[0.08] bg-white/[0.03] text-sm hover:bg-white/[0.06]"
            >
              <span className="flex items-center gap-2">
                {isMoving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {currentLabel}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-48 rounded-xl border-white/[0.08] bg-popover"
            align="start"
          >
            {availableColumns.map((col) => {
              const s = STAGE_STYLES[col.id] || STAGE_STYLES.novo_lead;
              return (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => handleStageChange(col.id)}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/[0.06]"
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                    {col.title}
                  </span>
                  {col.id === localStatus && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick stage buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          {availableColumns.map((col) => {
            const s = STAGE_STYLES[col.id] || STAGE_STYLES.novo_lead;
            const isActive = col.id === localStatus;
            return (
              <button
                key={col.id}
                onClick={() => handleStageChange(col.id)}
                disabled={isMoving}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 disabled:opacity-50",
                  isActive
                    ? cn(s.badge, "ring-1 ring-inset ring-current/30")
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
                <span className="truncate">{col.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Business summary */}
      {conversation.veiculo_interesse && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Resumo do Negócio
          </div>

          <div className="flex flex-col gap-2">
            {conversation.veiculo_interesse && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Car className="h-3 w-3" />
                  Veículo de Interesse
                </div>
                <p className="text-sm text-foreground">{conversation.veiculo_interesse}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
