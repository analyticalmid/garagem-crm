import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Info,
  Loader2,
  ShieldAlert,
  TriangleAlert,
  CircleCheckBig,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications, type NotificationRecord } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";

const notificationTypeMap = {
  info: {
    icon: Info,
    iconClass: "border-blue-400/15 bg-blue-500/12 text-blue-200",
    badgeClass: "border-blue-400/15 bg-blue-500/12 text-blue-100",
    label: "Informativo",
  },
  success: {
    icon: CircleCheckBig,
    iconClass: "border-emerald-400/15 bg-emerald-500/12 text-emerald-200",
    badgeClass: "border-emerald-400/15 bg-emerald-500/12 text-emerald-100",
    label: "Sucesso",
  },
  warning: {
    icon: TriangleAlert,
    iconClass: "border-amber-400/15 bg-amber-500/12 text-amber-100",
    badgeClass: "border-amber-400/15 bg-amber-500/12 text-amber-100",
    label: "Atenção",
  },
  error: {
    icon: ShieldAlert,
    iconClass: "border-red-400/15 bg-red-500/12 text-red-200",
    badgeClass: "border-red-400/15 bg-red-500/12 text-red-100",
    label: "Crítico",
  },
} as const;

const categoryLabels = {
  system: "Sistema",
  lead: "Lead",
  task: "Tarefa",
  sale: "Venda",
  security: "Segurança",
} as const;

type NotificationTab = "all" | "updates" | "alerts";

const tabMeta: Record<NotificationTab, { label: string; emptyTitle: string; emptyDescription: string }> = {
  all: {
    label: "All",
    emptyTitle: "Nenhuma notificação",
    emptyDescription: "Os próximos avisos da operação vão aparecer aqui.",
  },
  updates: {
    label: "Updates",
    emptyTitle: "Sem updates agora",
    emptyDescription: "Atualizações de vendas, sistema e pipeline aparecem nesta aba.",
  },
  alerts: {
    label: "Alerts",
    emptyTitle: "Sem alertas no momento",
    emptyDescription: "Quando houver algo crítico ou pendente, você verá por aqui.",
  },
};

const isAlertNotification = (notification: NotificationRecord) =>
  notification.type === "warning" || notification.type === "error" || notification.category === "task" || notification.category === "security";

const iconAccentMap = {
  info: "from-[#5b7cff] to-[#7c94ff] text-white shadow-[0_12px_24px_rgba(91,124,255,0.38)]",
  success: "from-[#4dbb7c] to-[#77d89b] text-white shadow-[0_12px_24px_rgba(77,187,124,0.28)]",
  warning: "from-[#ff8b4f] to-[#ffb067] text-white shadow-[0_12px_24px_rgba(255,139,79,0.28)]",
  error: "from-[#ff674f] to-[#ff8a72] text-white shadow-[0_12px_24px_rgba(255,103,79,0.28)]",
} as const;

export function NotificationCenter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, isMarkingAll } = useNotifications();

  const filteredNotifications = useMemo(() => {
    if (activeTab === "updates") {
      return notifications.filter((notification) => !isAlertNotification(notification));
    }

    if (activeTab === "alerts") {
      return notifications.filter((notification) => isAlertNotification(notification));
    }

    return notifications;
  }, [activeTab, notifications]);

  const handleOpenNotification = async (notification: NotificationRecord) => {
    try {
      if (!notification.read_at) {
        await markAsRead(notification.id);
      }

      if (notification.action_url?.startsWith("/")) {
        setOpen(false);
        navigate(notification.action_url);
      }
    } catch {
      toast({
        title: "Erro ao abrir notificação",
        description: "Não foi possível atualizar o status dessa notificação.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      toast({
        title: "Notificações atualizadas",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    } catch {
      toast({
        title: "Erro ao atualizar notificações",
        description: "Não foi possível marcar todas como lidas.",
        variant: "destructive",
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-all hover:border-white/20 hover:bg-white/10 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-blue-300/20 bg-[linear-gradient(135deg,#3b82f6,#2563eb)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-[0_10px_20px_rgba(37,99,235,0.35)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={14}
        className="w-[410px] origin-top-right rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,28,0.96),rgba(10,18,38,0.94))] p-0 text-slate-100 shadow-[0_32px_90px_rgba(3,8,20,0.55)] backdrop-blur-[28px] data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:slide-in-from-top-3 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
      >
        <div className="relative overflow-hidden rounded-[30px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.34),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
          <div className="relative z-10 flex flex-col">
            <div className="px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">Notificações</p>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-tight text-white">Central minimalista</h3>
                  <p className="mt-1 text-sm text-slate-300">Atualizações e alertas da operação em um painel compacto.</p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#3b82f6)] text-white shadow-[0_18px_30px_rgba(37,99,235,0.34)]">
                  <Bell className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-[20px] border border-white/8 bg-white/[0.06] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Unread</p>
                  <p className="mt-1 text-[26px] font-semibold leading-none text-white">{unreadCount}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={unreadCount === 0 || isMarkingAll}
                  onClick={handleMarkAll}
                  className="h-10 rounded-full border border-white/10 bg-white/[0.08] px-4 text-xs font-semibold text-slate-100 shadow-[0_8px_24px_rgba(5,10,24,0.18)] hover:bg-white/[0.14]"
                >
                  {isMarkingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                  Marcar todas
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotificationTab)} className="px-5 pb-5">
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-[20px] border border-white/8 bg-white/[0.06] p-1 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                {Object.entries(tabMeta).map(([key, value]) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="rounded-[16px] px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-[linear-gradient(135deg,rgba(37,99,235,0.95),rgba(59,130,246,0.92))] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_26px_rgba(37,99,235,0.32)]"
                  >
                    {value.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(tabMeta).map((key) => {
                const tabKey = key as NotificationTab;
                const visibleNotifications = tabKey === activeTab ? filteredNotifications : [];

                return (
                  <TabsContent key={tabKey} value={tabKey} className="mt-4 focus-visible:ring-0">
                    <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <ScrollArea className="h-[392px] rounded-[18px]">
                        <div className="space-y-3 pr-2">
                        {isLoading ? (
                          Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={index}
                              className="h-[92px] animate-pulse rounded-[22px] bg-white/[0.06]"
                            />
                          ))
                        ) : visibleNotifications.length === 0 ? (
                          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[26px] border border-white/8 bg-white/[0.04] px-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#5b7cff,#7a8fff)] text-white shadow-[0_14px_28px_rgba(91,124,255,0.28)]">
                              <UserRound className="h-6 w-6" />
                            </div>
                            <h4 className="mt-4 text-lg font-semibold text-white">{tabMeta[tabKey].emptyTitle}</h4>
                            <p className="mt-2 max-w-[16rem] text-sm leading-6 text-slate-400">{tabMeta[tabKey].emptyDescription}</p>
                          </div>
                        ) : (
                          visibleNotifications.map((notification) => {
                            const tone = notificationTypeMap[notification.type];
                            const Icon = tone.icon;
                            const accentClass = iconAccentMap[notification.type];

                            return (
                              <div
                                key={notification.id}
                                className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,30,56,0.92),rgba(12,22,42,0.9))] p-3 shadow-[0_18px_40px_rgba(4,8,18,0.28)] transition hover:border-white/15 hover:bg-[linear-gradient(180deg,rgba(22,36,67,0.95),rgba(14,25,47,0.93))]"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br ${accentClass}`}>
                                    <Icon className="h-4.5 w-4.5" />
                                  </div>

                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    <div className="flex min-w-0 flex-col gap-2">
                                      <div className="min-w-0">
                                        <div className="flex min-w-0 items-center gap-2">
                                          <p className="truncate text-base font-semibold leading-5 text-white">{notification.title}</p>
                                          {!notification.read_at ? (
                                            <span className="inline-flex h-2 w-2 rounded-full bg-[#2f69ff] shadow-[0_0_12px_rgba(47,105,255,0.45)]" />
                                          ) : null}
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-300">{notification.message}</p>
                                      </div>

                                      <div className="w-fit max-w-full truncate rounded-[12px] border border-blue-400/20 bg-blue-500/15 px-2 py-1 text-[10px] font-semibold text-blue-100 shadow-[0_10px_18px_rgba(47,105,255,0.14)]">
                                        {categoryLabels[notification.category]}
                                      </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-[11px] font-medium text-slate-400">
                                        {formatDistanceToNow(new Date(notification.created_at), {
                                          addSuffix: true,
                                          locale: ptBR,
                                        })}
                                      </p>

                                      <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
                                        {!notification.read_at ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => handleOpenNotification(notification)}
                                            className="h-7 rounded-full px-2 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white"
                                          >
                                            Lida
                                          </Button>
                                        ) : null}

                                        {notification.action_url?.startsWith("/") ? (
                                          <Button
                                            type="button"
                                            onClick={() => handleOpenNotification(notification)}
                                            className="h-7 max-w-full rounded-full border-0 bg-[linear-gradient(135deg,#2563eb,#3b82f6)] px-3 text-[10px] font-semibold text-white shadow-[0_14px_26px_rgba(37,99,235,0.26)]"
                                          >
                                            <span className="truncate">{notification.action_label || "Abrir"}</span>
                                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}