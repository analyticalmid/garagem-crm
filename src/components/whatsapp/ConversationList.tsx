import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { WhatsappConversation } from "@/views/Whatsapp";

const AVATAR_COLORS = [
  "from-blue-500/40 to-blue-700/30",
  "from-violet-500/40 to-violet-700/30",
  "from-emerald-500/40 to-emerald-700/30",
  "from-orange-500/40 to-orange-700/30",
  "from-pink-500/40 to-pink-700/30",
  "from-teal-500/40 to-teal-700/30",
  "from-amber-500/40 to-amber-700/30",
  "from-rose-500/40 to-rose-700/30",
];

function avatarColor(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  try {
    const date = parseISO(iso);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  } catch {
    return "";
  }
}

interface Props {
  conversations: WhatsappConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  isLoading,
}: Props) {
  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.lead_nome?.toLowerCase().includes(q) ||
      c.telefone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-white/[0.06] bg-black/20">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar contato..."
            className="h-9 rounded-xl border-white/[0.06] bg-white/[0.03] pl-9 text-sm focus-visible:border-primary/30 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-full animate-pulse rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Search className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="p-2">
            {filtered.map((conv) => {
              const isActive = conv.id === selectedId;
              const name = conv.lead_nome || conv.telefone || "Sem nome";
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150",
                    isActive
                      ? "bg-primary/15 ring-1 ring-primary/20"
                      : "hover:bg-white/[0.04] active:bg-white/[0.07]",
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm",
                      avatarColor(name),
                    )}
                  >
                    {getInitials(name)}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          isActive ? "text-primary" : "text-foreground",
                        )}
                      >
                        {name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(conv.ultima_mensagem_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.ultima_mensagem_preview || "Sem mensagens ainda"}
                      </p>
                      {conv.nao_lidas > 0 && (
                        <span className="ml-1 flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground leading-none">
                          {conv.nao_lidas > 99 ? "99+" : conv.nao_lidas}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
