import { useRef, useEffect, useState } from "react";
import { Phone, Paperclip, Send, Smile, Loader2, MessageSquare } from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { KANBAN_COLUMNS } from "@/types/lead";
import type { WhatsappConversation, WhatsappMessage } from "@/views/Whatsapp";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function groupMessagesByDate(messages: WhatsappMessage[]) {
  const groups: { label: string; messages: WhatsappMessage[] }[] = [];
  const map = new Map<string, WhatsappMessage[]>();

  for (const msg of messages) {
    try {
      const date = parseISO(msg.created_at);
      let label: string;
      if (isToday(date)) label = "Hoje";
      else if (isYesterday(date)) label = "Ontem";
      else label = format(date, "dd 'de' MMMM", { locale: ptBR });

      if (!map.has(label)) {
        map.set(label, []);
        groups.push({ label, messages: map.get(label)! });
      }
      map.get(label)!.push(msg);
    } catch {
      // skip malformed dates
    }
  }
  return groups;
}

function formatMsgTime(iso: string) {
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return "";
  }
}

function kanbanLabel(status: string) {
  return KANBAN_COLUMNS.find((c) => c.id === status)?.title || status;
}

function kanbanDotColor(status: string) {
  const map: Record<string, string> = {
    novo_lead: "bg-kanban-novo",
    negociando: "bg-kanban-negociando",
    vendido: "bg-kanban-vendido",
    perdido: "bg-kanban-perdido",
  };
  return map[status] || "bg-muted";
}

interface Props {
  conversation: WhatsappConversation;
  messages: WhatsappMessage[];
  isLoadingMessages: boolean;
  onSendMessage: (text: string) => void;
  isSending: boolean;
}

export function ChatWindow({
  conversation,
  messages,
  isLoadingMessages,
  onSendMessage,
  isSending,
}: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isSending) return;
    onSendMessage(text);
    setDraft("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const name = conversation.lead_nome || conversation.telefone || "Sem nome";
  const phone = conversation.telefone?.replace("@s.whatsapp.net", "") || "";
  const groups = groupMessagesByDate(messages);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Chat header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-bold text-primary">
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  kanbanDotColor(conversation.lead_kanban_status),
                )}
              />
              <span className="text-xs text-muted-foreground">
                {kanbanLabel(conversation.lead_kanban_status)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/[0.06] text-muted-foreground hover:text-foreground">
                <Phone className="h-4 w-4" />
              </Button>
            </a>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/[0.06] text-muted-foreground hover:text-foreground">
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-20" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {groups.map((group) => (
              <div key={group.label}>
                {/* Date separator */}
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="rounded-full bg-white/[0.05] px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {/* Messages */}
                <div className="flex flex-col gap-1">
                  {group.messages.map((msg) => {
                    const isAgent = msg.enviada_pelo_agente;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isAgent ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[72%] rounded-2xl px-3.5 py-2 shadow-sm",
                            isAgent
                              ? "rounded-br-sm bg-primary/25 ring-1 ring-primary/20"
                              : "rounded-bl-sm bg-white/[0.07] ring-1 ring-white/[0.06]",
                          )}
                        >
                          {msg.conteudo && (
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                              {msg.conteudo}
                            </p>
                          )}
                          <p
                            className={cn(
                              "mt-0.5 text-right text-[10px]",
                              isAgent ? "text-primary/60" : "text-muted-foreground",
                            )}
                          >
                            {formatMsgTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input footer */}
      <div className="shrink-0 border-t border-white/[0.06] px-4 py-3">
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="mb-0.5 h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem... (Enter para enviar)"
            rows={1}
            className="max-h-32 min-h-[38px] flex-1 resize-none rounded-xl border-white/[0.06] bg-white/[0.04] text-sm leading-relaxed focus-visible:border-primary/30 focus-visible:ring-primary/20"
          />
          <Button
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            size="icon"
            className="mb-0.5 h-8 w-8 shrink-0 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
