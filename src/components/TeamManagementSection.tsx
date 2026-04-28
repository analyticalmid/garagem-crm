import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Send, ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { apiFetch, dataUrl } from "@/lib/api";
import type { AppRole, PlanType } from "@/types/auth";

type Invitation = {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  created_at: string;
  accepted_at: string | null;
};

type TeamLimit = {
  canInvite: boolean;
  planType: "pro" | "essencial" | null;
  tenantId: string | null;
};

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  gerente: "Gerente",
  vendedor: "Vendedor",
};

const planLabels: Record<PlanType, string> = {
  pro: "Plano Pro",
  essencial: "Plano Essencial",
};

const planBadgeClassName: Record<PlanType, string> = {
  pro: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  essencial: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
};

export function TeamManagementSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isGerente } = useAuth();
  const { users, isLoading: usersLoading } = useUsers();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("vendedor");

  const canInviteUsers = isAdmin || isGerente;

  const invitationsQuery = useQuery({
    queryKey: ["team-invitations"],
    queryFn: () => apiFetch<Invitation[]>(dataUrl("team-invitations")),
  });

  const limitQuery = useQuery({
    queryKey: ["team-limit"],
    queryFn: () => apiFetch<TeamLimit>(dataUrl("team-limit")),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ authInviteSent: boolean }>(dataUrl("team-invitation"), {
        method: "POST",
        body: { email, role },
      });
    },
    onSuccess: (result) => {
      setEmail("");
      setRole("vendedor");
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["team-limit"] });
      toast({
        title: "Convite registrado",
        description: result.authInviteSent
          ? "O e-mail de convite foi enviado pelo Supabase Auth."
          : "Convite pendente criado. Configure SUPABASE_SERVICE_ROLE_KEY para envio automático.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao convidar",
        description: error instanceof Error ? error.message : "Não foi possível criar o convite.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate();
  };

  const pendingInvitations = (invitationsQuery.data || []).filter((invitation) => invitation.status === "pending");
  const activeUsersCount = users.filter((user) => user.is_active).length;
  const occupiedSeats = activeUsersCount + pendingInvitations.length;

  return (
    <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Plano Essencial
          </div>
          <h2 className="text-xl font-semibold text-foreground">Gestão de Equipe</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Convide usuários para o mesmo tenant e acompanhe assentos ativos e convites pendentes.
          </p>
        </div>
        <div className="grid min-w-[220px] grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Assentos</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{occupiedSeats}/3</p>
          </div>
          <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Pendentes</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{pendingInvitations.length}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
        <div className="space-y-2">
          <Label htmlFor="team-invite-email" className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            E-mail
          </Label>
          <Input
            id="team-invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vendedor@garagem.com"
            disabled={!canInviteUsers || inviteMutation.isPending || limitQuery.data?.canInvite === false}
            className="h-11 rounded-2xl border-white/[0.08] bg-white/[0.04]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cargo</Label>
          <Select value={role} onValueChange={(value) => setRole(value as AppRole)} disabled={!canInviteUsers || inviteMutation.isPending}>
            <SelectTrigger className="h-11 rounded-2xl border-white/[0.08] bg-white/[0.04]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendedor">Vendedor</SelectItem>
              <SelectItem value="gerente">Gerente</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={!canInviteUsers || !email.trim() || inviteMutation.isPending || limitQuery.data?.canInvite === false}
            className="h-11 w-full rounded-2xl border-0 bg-gradient-to-r from-primary to-blue-400 px-5 lg:w-auto"
          >
            {inviteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Convidar
          </Button>
        </div>
      </form>

      {limitQuery.data?.canInvite === false && (
        <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Limite de usuários do plano Essencial atingido.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <UsersRound className="h-4 w-4 text-blue-300" />
            Usuários atuais
          </div>
          <div className="space-y-3">
            {usersLoading ? (
              <Card className="rounded-[22px] border-white/[0.06] p-4 glass">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </Card>
            ) : (
              users.map((user) => (
                <Card key={user.id} className="rounded-[22px] border-white/[0.06] p-4 glass">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{user.full_name || user.email}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant="outline" className="border-white/[0.08] bg-white/[0.04]">
                        {user.role ? roleLabels[user.role] : "Sem cargo"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={planBadgeClassName[user.plan_type] ?? "border-white/[0.08] bg-white/[0.04]"}
                      >
                        {planLabels[user.plan_type] ?? "Plano não definido"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <UserRoundPlus className="h-4 w-4 text-emerald-300" />
            Convites pendentes
          </div>
          <div className="space-y-3">
            {invitationsQuery.isLoading ? (
              <Card className="rounded-[22px] border-white/[0.06] p-4 glass">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </Card>
            ) : pendingInvitations.length > 0 ? (
              pendingInvitations.map((invitation) => (
                <Card key={invitation.id} className="rounded-[22px] border-white/[0.06] p-4 glass">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{invitation.email}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("pt-BR").format(new Date(invitation.created_at))}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 border-amber-400/20 bg-amber-400/10 text-amber-100">
                      {roleLabels[invitation.role]}
                    </Badge>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="rounded-[22px] border-white/[0.06] p-4 text-sm text-muted-foreground glass">
                Nenhum convite pendente.
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
