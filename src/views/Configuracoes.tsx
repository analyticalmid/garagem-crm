import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { UserManagementSection } from "@/components/UserManagementSection";
import { BellRing, Camera, FileDown, Loader2, LockKeyhole, Save, Settings2, ShieldCheck, SlidersHorizontal, UserCircle2 } from "lucide-react";
import { apiFetch, dataUrl } from "@/lib/api";

const roleLabels = {
  admin: "Admin",
  gerente: "Gerente",
  vendedor: "Vendedor",
} as const;

type ConfigTab = "geral" | "usuarios";
type NotificationPreferences = Database["public"]["Tables"]["notification_preferences"]["Row"];
type NotificationPreferenceFlagKey = keyof Pick<NotificationPreferences, "task_enabled" | "lead_enabled" | "sale_enabled" | "security_enabled" | "system_enabled" | "push_enabled" | "email_enabled">;

const notificationCategoryItems: Array<{
  key: NotificationPreferenceFlagKey;
  title: string;
  description: string;
}> = [
  {
    key: "task_enabled",
    title: "Tarefas vencidas",
    description: "Avisa quando houver tarefas pendentes com vencimento ultrapassado.",
  },
  {
    key: "lead_enabled",
    title: "Leads sem andamento",
    description: "Monitora leads e pré-vendas parados por tempo demais.",
  },
  {
    key: "sale_enabled",
    title: "Novas vendas",
    description: "Recebe avisos quando uma venda for registrada no CRM.",
  },
  {
    key: "security_enabled",
    title: "Segurança",
    description: "Reserva alertas para eventos sensíveis e acesso da conta.",
  },
  {
    key: "system_enabled",
    title: "Sistema",
    description: "Mantém notificações operacionais e comunicados gerais ativos.",
  },
];

const notificationChannelItems: Array<{
  key: keyof Pick<NotificationPreferences, "push_enabled" | "email_enabled">;
  title: string;
  description: string;
}> = [
  {
    key: "push_enabled",
    title: "Push interno",
    description: "Salva sua preferência para alertas em tempo real dentro do produto.",
  },
  {
    key: "email_enabled",
    title: "E-mail",
    description: "Deixa o canal pronto para futuras entregas por e-mail.",
  },
];

export default function Configuracoes() {
  const { profile, role, isAdmin, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("aba") === "usuarios" ? "usuarios" : "geral";
  const [activeTab, setActiveTab] = useState<ConfigTab>(requestedTab);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [updatingPreferenceKey, setUpdatingPreferenceKey] = useState<keyof NotificationPreferences | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const notificationPreferencesQuery = useQuery({
    queryKey: ["notification-preferences", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      return apiFetch<NotificationPreferences>(dataUrl("notification-preferences"));
    },
  });

  const updateNotificationPreferences = useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: NotificationPreferenceFlagKey;
      value: boolean;
    }) => {
      if (!profile?.id) throw new Error("Perfil não encontrado.");

      await apiFetch(dataUrl("notification-preferences"), { method: "PATCH", body: { [key]: value } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
      toast({
        title: "Preferências atualizadas",
        description: "Seus alertas foram ajustados com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar notificações",
        description: "Não foi possível salvar suas preferências agora.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingPreferenceKey(null);
    },
  });

  useEffect(() => {
    if (requestedTab === "usuarios" && !isAdmin) {
      setActiveTab("geral");
      setSearchParams({}, { replace: true });
      return;
    }

    setActiveTab(requestedTab);
  }, [isAdmin, requestedTab, setSearchParams]);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
  }, [profile?.full_name, profile?.phone]);

  const handleTabChange = (value: string) => {
    const nextTab = value as ConfigTab;
    setActiveTab(nextTab);
    if (nextTab === "usuarios") {
      setSearchParams({ aba: "usuarios" }, { replace: true });
      return;
    }
    setSearchParams({}, { replace: true });
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    setIsSavingProfile(true);

    try {
      await apiFetch(dataUrl("profile"), {
        method: "PATCH",
        body: {
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
        },
      });
    } catch {
      toast({
        title: "Erro ao salvar perfil",
        description: "Não foi possível atualizar suas informações.",
        variant: "destructive",
      });
      setIsSavingProfile(false);
      return;
    }

    await refreshProfile();
    setIsSavingProfile(false);
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram salvas com sucesso.",
    });
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() || "?";

  const getAvatarStoragePath = (avatarUrl: string | null | undefined) => {
    if (!avatarUrl) return null;

    const marker = "/storage/v1/object/public/profile-avatars/";
    const markerIndex = avatarUrl.indexOf(marker);

    if (markerIndex === -1) return null;

    return avatarUrl.slice(markerIndex + marker.length).split("?")[0] || null;
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !profile?.id) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use uma imagem JPG, PNG ou WEBP.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A foto deve ter no máximo 5 MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    const previousAvatarPath = getAvatarStoragePath(profile.avatar_url);
    const formData = new FormData();
    formData.set("file", file);
    if (previousAvatarPath) {
      formData.set("previousAvatarPath", previousAvatarPath);
    }

    try {
      await apiFetch(dataUrl("avatar"), { method: "POST", body: formData });
    } catch {
      setIsUploadingAvatar(false);
      toast({
        title: "Erro ao enviar foto",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
      return;
    }

    await refreshProfile();
    setIsUploadingAvatar(false);
    toast({
      title: "Foto atualizada",
      description: "Sua foto de perfil foi salva no banco de dados.",
    });
  };

  const handleTogglePreference = (
    key: keyof Pick<NotificationPreferences, "task_enabled" | "lead_enabled" | "sale_enabled" | "security_enabled" | "system_enabled" | "push_enabled" | "email_enabled">,
    value: boolean,
  ) => {
    setUpdatingPreferenceKey(key);
    updateNotificationPreferences.mutate({ key, value });
  };

  return (
    <div className="space-y-6 pb-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/[0.06] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.34)] glass md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_75%_10%,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100/80">
              <Settings2 className="h-3.5 w-3.5" />
              Central de configurações
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Configurações e administração</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Centralize preferências operacionais, acessos da equipe e atalhos do CRM em uma única área premium.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[440px]">
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Seu perfil</p>
              <p className="mt-2 truncate text-lg font-semibold text-foreground">{profile?.full_name || profile?.email || "Sem identificação"}</p>
            </div>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Nível de acesso</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{role ? roleLabels[role] : "Sem cargo"}</p>
            </div>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Módulos</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{isAdmin ? "Equipe + Sistema" : "Sistema"}</p>
            </div>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="h-auto rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-1.5">
          <TabsTrigger value="geral" className="rounded-2xl px-4 py-2.5 data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="rounded-2xl px-4 py-2.5 data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground" disabled={!isAdmin}>
            <UserCircle2 className="mr-2 h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Perfil e acesso</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Informações de conta e escopo atual dentro da operação.</p>
                </div>
                <Badge variant="outline" className="border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-foreground">
                  Sessão protegida
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                      <UserCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Perfil pessoal</p>
                      <p className="text-xs text-muted-foreground">Atualize seus dados visíveis dentro do CRM</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 rounded-[20px] border border-white/[0.06] bg-black/10 p-4">
                      <Avatar className="h-24 w-24 ring-2 ring-primary/20">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || profile?.email || "Perfil"} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-xl font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="w-full rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
                      >
                        {isUploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        {isUploadingAvatar ? "Enviando foto..." : "Adicionar foto de perfil"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-full-name" className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Nome</Label>
                      <Input
                        id="profile-full-name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Seu nome completo"
                        className="rounded-xl border-white/[0.08] bg-white/[0.04]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-email" className="text-xs uppercase tracking-[0.14em] text-muted-foreground">E-mail</Label>
                      <Input
                        id="profile-email"
                        value={profile?.email || ""}
                        disabled
                        className="rounded-xl border-white/[0.08] bg-white/[0.03] text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-phone" className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Telefone</Label>
                      <Input
                        id="profile-phone"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="(00) 00000-0000"
                        className="rounded-xl border-white/[0.08] bg-white/[0.04]"
                      />
                    </div>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="w-full rounded-xl bg-gradient-to-r from-primary to-blue-400 border-0"
                    >
                      {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Salvar perfil
                    </Button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Permissões</p>
                      <p className="text-xs text-muted-foreground">Escopo disponível para sua função</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-0 bg-white/[0.08] text-foreground hover:bg-white/[0.08]">{role ? roleLabels[role] : "Sem cargo"}</Badge>
                    <Badge className="border-0 bg-white/[0.08] text-foreground hover:bg-white/[0.08]">Leads</Badge>
                    <Badge className="border-0 bg-white/[0.08] text-foreground hover:bg-white/[0.08]">Veículos</Badge>
                    <Badge className="border-0 bg-white/[0.08] text-foreground hover:bg-white/[0.08]">Vendas</Badge>
                    {isAdmin && <Badge className="border-0 bg-primary/20 text-primary hover:bg-primary/20">Gestão de usuários</Badge>}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">Atalhos úteis</h2>
                <p className="mt-1 text-sm text-muted-foreground">Acesse rapidamente as áreas relacionadas à operação e governança.</p>
              </div>
              <div className="space-y-3">
                <Link to="/exportar" className="flex items-center justify-between rounded-[22px] border border-white/[0.06] bg-white/[0.03] px-4 py-4 transition hover:bg-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                      <FileDown className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Central de exportação</p>
                      <p className="text-xs text-muted-foreground">Baixe leads, estoque, vendas e margens em CSV.</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-primary">Abrir</span>
                </Link>

                <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
                      <BellRing className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Alertas operacionais</p>
                      <p className="text-xs text-muted-foreground">Use o Dashboard para monitorar leads e estoque parados em tempo real.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Segurança e acesso</p>
                      <p className="text-xs text-muted-foreground">A autenticação e os papéis continuam centralizados no Supabase e nas roles do CRM.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Preferências de notificação</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Defina quais alertas automáticos você quer receber para tarefas vencidas, leads parados e novas vendas.
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-foreground">
                Bell center
              </Badge>
            </div>

            {notificationPreferencesQuery.isLoading ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-white/[0.06] bg-white/[0.03]">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : notificationPreferencesQuery.data ? (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  {notificationCategoryItems.map((item) => {
                    const checked = notificationPreferencesQuery.data[item.key];
                    const isUpdating = updatingPreferenceKey === item.key && updateNotificationPreferences.isPending;

                    return (
                      <div key={item.key} className="flex items-center justify-between gap-4 rounded-[22px] border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                        </div>
                        <Switch
                          checked={checked}
                          onCheckedChange={(value) => handleTogglePreference(item.key, value)}
                          disabled={updateNotificationPreferences.isPending}
                          aria-label={item.title}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <BellRing className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Canais</p>
                        <p className="text-xs text-muted-foreground">As preferências ficam salvas no banco e prontas para evoluções futuras.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {notificationChannelItems.map((item) => {
                        const checked = notificationPreferencesQuery.data[item.key];
                        const isUpdating = updatingPreferenceKey === item.key && updateNotificationPreferences.isPending;

                        return (
                          <div key={item.key} className="flex items-center justify-between gap-4 rounded-[20px] border border-white/[0.06] bg-black/10 px-4 py-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                                {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                              </div>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                            </div>
                            <Switch
                              checked={checked}
                              onCheckedChange={(value) => handleTogglePreference(item.key, value)}
                              disabled={updateNotificationPreferences.isPending}
                              aria-label={item.title}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/[0.06] bg-gradient-to-br from-primary/10 via-white/[0.04] to-transparent p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-primary/80">Automação ativa</p>
                    <p className="mt-3 text-sm font-medium text-foreground">O CRM sincroniza alertas de atraso e estagnação sempre que a central de notificações é atualizada.</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Vendas novas entram automaticamente pelo banco, enquanto tarefas vencidas e leads parados são reconciliados na abertura e nos refreshes da central.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100/90">
                Não foi possível carregar suas preferências de notificação.
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-0">
          {isAdmin ? (
            <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Equipe e permissões</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Aba administrativa para edição de cargos, contatos e status de acesso.</p>
                </div>
                <Badge className="border-0 bg-primary/20 text-primary hover:bg-primary/20">Admin</Badge>
              </div>
              <UserManagementSection showHeader={false} />
            </section>
          ) : (
            <section className="rounded-[28px] border border-white/[0.06] p-6 text-sm text-muted-foreground shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
              Esta área é exclusiva para administradores.
            </section>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
