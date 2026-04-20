import { memo } from "react";
import { Lead } from "@/types/lead";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBrazilianPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Clock3, Instagram, MessageCircleMore } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
}

const statusAccentMap = {
  novo_lead: "#3B82F6",
  negociando: "#F59E0B",
  vendido: "#10B981",
  perdido: "#EF4444",
} as const;

export const LeadCard = memo(function LeadCard({ lead, onClick }: LeadCardProps) {
  const referenceDate = lead.lastInteractionAt || lead.created_at;
  const daysIdle = differenceInDays(new Date(), new Date(referenceDate));
  const isStalled = daysIdle >= 5;
  const isCritical = daysIdle >= 10;
  const initials = (lead.nome || "Sem nome")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("") || "SL";
  const accentColor = statusAccentMap[lead.status];
  const timeAgo = formatDistanceToNow(new Date(referenceDate), {
    addSuffix: true,
    locale: ptBR,
  });
  const ChannelIcon = lead.channel === "instagram" ? Instagram : MessageCircleMore;
  const channelLabel = lead.channel === "instagram" ? "Instagram" : "WhatsApp";
  const channelClass = lead.channel === "instagram"
    ? "text-pink-300 bg-pink-500/10 border-pink-400/20"
    : "text-emerald-300 bg-emerald-500/10 border-emerald-400/20";

  return (
    <div
      className="group relative min-h-[168px] overflow-hidden rounded-[20px] px-4 py-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(135deg, hsl(225, 30%, 12%), hsl(225, 30%, 9%))',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 10px 30px rgba(3, 8, 20, 0.22)',
      }}
      onClick={onClick}
    >
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{
          background: accentColor,
          boxShadow: `0 0 18px ${accentColor}66`,
        }}
      />

      <div className="flex h-full flex-col gap-4 pl-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-foreground"
            style={{
              background: `${accentColor}1f`,
              border: `1px solid ${accentColor}33`,
            }}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[15px] font-semibold text-foreground leading-tight truncate pr-2">
              {lead.nome || "Sem nome"}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground/90">
              <ChannelIcon className={cn("h-3.5 w-3.5 shrink-0", lead.channel === "instagram" ? "text-pink-300" : "text-emerald-400")} />
              <span className="truncate">{formatBrazilianPhone(lead.telefone) || "Sem telefone"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
            channelClass,
          )}>
            <ChannelIcon className="h-3 w-3" />
            {channelLabel}
          </span>

          <span className="inline-flex max-w-full items-center rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[11px] font-medium text-slate-200">
            {lead.assignedUserName || "Sem responsável"}
          </span>

          <span
            className="inline-flex max-w-full items-center truncate rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[11px] font-medium text-slate-300"
            title={lead.leadType || "Lead"}
          >
            {lead.leadType || "Lead"}
          </span>

          {lead.iaRespondeu && (
            <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300">
              IA
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
          <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
            isCritical ? "text-red-400 bg-red-400/10 border-red-400/20" :
            isStalled ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
            "text-muted-foreground bg-white/[0.04] border-white/[0.06]"
          )}>
            {daysIdle === 0 ? "Hoje" : `${daysIdle} dias`}
          </span>

          <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground/90 text-right">
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{timeAgo}</span>
          </span>
        </div>
      </div>
    </div>
  );
});
