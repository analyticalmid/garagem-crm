import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Mail, Phone, Plus, ShieldCheck, ShieldX, UserCircle, UserCog, Users } from "lucide-react";
import { AppRole, PlanType, UserWithRole } from "@/types/auth";

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

type UserManagementSectionProps = {
  showHeader?: boolean;
};

export function UserManagementSection({ showHeader = true }: UserManagementSectionProps) {
  const { users, isLoading, updateProfile, updateRole, toggleActive } = useUsers();
  const { canManageUsers, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("vendedor");

  const accessSummary = useMemo(() => {
    const activeUsers = users.filter((userRecord) => userRecord.is_active);
    const inactiveUsers = users.filter((userRecord) => !userRecord.is_active);
    const admins = activeUsers.filter((userRecord) => userRecord.role === "admin");
    const gerentes = activeUsers.filter((userRecord) => userRecord.role === "gerente");
    const missingRole = users.filter((userRecord) => !userRecord.role);
    const activeMissingRole = activeUsers.filter((userRecord) => !userRecord.role);

    return {
      total: users.length,
      active: activeUsers.length,
      inactive: inactiveUsers.length,
      admins: admins.length,
      gerentes: gerentes.length,
      missingRole: missingRole.length,
      activeMissingRole: activeMissingRole.length,
      warnings: [
        activeMissingRole.length > 0
          ? `${activeMissingRole.length} usuário(s) ativo(s) estão sem cargo e podem ficar com acesso operacional limitado.`
          : null,
        admins.length === 0
          ? "Nenhum admin ativo encontrado. Isso pode travar futuras gestões de acesso."
          : null,
        inactiveUsers.length > 0
          ? `${inactiveUsers.length} conta(s) estão inativas após o endurecimento de segurança.`
          : null,
      ].filter(Boolean) as string[],
    };
  }, [users]);

  const handleEdit = (userRecord: UserWithRole) => {
    setEditingUser(userRecord);
    setEditFullName(userRecord.full_name || "");
    setEditPhone(userRecord.phone || "");
    setEditRole(userRecord.role || "vendedor");
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await updateProfile.mutateAsync({
        id: editingUser.id,
        updates: {
          full_name: editFullName,
          phone: editPhone,
        },
      });

      if (editingUser.role !== editRole) {
        await updateRole.mutateAsync({
          userId: editingUser.id,
          newRole: editRole,
        });
      }

      toast({
        title: "Usuário atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsEditOpen(false);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (userRecord: UserWithRole) => {
    try {
      await toggleActive.mutateAsync({
        id: userRecord.id,
        isActive: !userRecord.is_active,
      });

      toast({
        title: userRecord.is_active ? "Usuário desativado" : "Usuário ativado",
        description: `${userRecord.full_name || userRecord.email} foi ${userRecord.is_active ? "desativado" : "ativado"}.`,
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do usuário.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {showHeader && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários</h1>
              <p className="text-muted-foreground">Gerencie permissões, contato e ativação da equipe.</p>
            </div>
            {canManageUsers && (
              <Button disabled className="rounded-xl border-0 bg-gradient-to-r from-primary to-blue-400 transition-all hover:shadow-lg hover:shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            )}
          </div>
        )}

        <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-muted-foreground shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
          Para adicionar novos usuários, crie-os no
          <a
            href="https://supabase.com/dashboard/project/rvioakfrwgycpbxkuziz/auth/users"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-medium text-primary underline-offset-4 transition hover:underline"
          >
            Supabase Dashboard
          </a>
          . A equipe aparece aqui automaticamente após a sincronização.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-[24px] border-white/[0.05] p-5 glass">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Equipe ativa</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{accessSummary.active}</p>
                <p className="mt-1 text-xs text-muted-foreground">{accessSummary.total} usuários no total</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border-white/[0.05] p-5 glass">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Admins ativos</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{accessSummary.admins}</p>
                <p className="mt-1 text-xs text-muted-foreground">{accessSummary.gerentes} gerente(s) ativo(s)</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border-white/[0.05] p-5 glass">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Contas inativas</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{accessSummary.inactive}</p>
                <p className="mt-1 text-xs text-muted-foreground">Usuários bloqueados pelo controle atual</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
                <ShieldX className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border-white/[0.05] p-5 glass">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Sem cargo</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{accessSummary.missingRole}</p>
                <p className="mt-1 text-xs text-muted-foreground">Revise cargos para evitar acessos limitados</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <UserCog className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {accessSummary.warnings.length > 0 && (
          <Alert className="rounded-[24px] border-amber-400/20 bg-amber-400/10 text-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <AlertTitle>Revisão de acesso recomendada</AlertTitle>
            <AlertDescription className="space-y-1 text-amber-100/85">
              {accessSummary.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {users.length === 0 ? (
          <Card className="rounded-[28px] border-white/[0.05] p-8 text-center glass">
            <UserCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">Nenhum usuário encontrado</h3>
            <p className="mt-1 text-muted-foreground">Crie usuários no Supabase Dashboard para começar.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {users.map((userRecord) => (
              <Card key={userRecord.id} className="rounded-[28px] border-white/[0.05] p-6 glass card-hover">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xl font-semibold text-foreground">
                        {userRecord.full_name || "Sem nome"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {userRecord.role ? roleLabels[userRecord.role] : "Sem cargo"}
                      </p>
                    </div>
                    <Badge variant={userRecord.is_active ? "available" : "sold"}>
                      {userRecord.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={planBadgeClassName[userRecord.plan_type] ?? "border-white/[0.08] bg-white/[0.04]"}
                    >
                      {planLabels[userRecord.plan_type] ?? "Plano não definido"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{userRecord.email}</span>
                    </div>
                    {userRecord.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{userRecord.phone}</span>
                      </div>
                    )}
                  </div>

                  {canManageUsers && userRecord.id !== currentUser?.id && (
                    <div className="flex gap-2 border-t border-white/[0.05] pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                        onClick={() => handleEdit(userRecord)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                        onClick={() => handleToggleActive(userRecord)}
                      >
                        {userRecord.is_active ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  )}

                  {userRecord.id === currentUser?.id && (
                    <div className="border-t border-white/[0.05] pt-4">
                      <Badge variant="outline" className="w-full justify-center">
                        Você
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-white/[0.08] glass-subtle">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nome completo</Label>
              <Input
                id="editFullName"
                value={editFullName}
                onChange={(event) => setEditFullName(event.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefone</Label>
              <Input
                id="editPhone"
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Cargo</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateProfile.isPending || updateRole.isPending}
              className="rounded-xl border-0 bg-gradient-to-r from-primary to-blue-400 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              {(updateProfile.isPending || updateRole.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
