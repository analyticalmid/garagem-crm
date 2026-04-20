import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, MessageCircleMore, Save, Shield, Sparkles, Trash2, UserCheck } from "lucide-react";
import { Lead } from "@/types/lead";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { formatBrazilianPhone } from "@/lib/utils";
import { apiFetch, dataUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LeadDetailsModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsModal({ lead, open, onOpenChange }: LeadDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canAssignLeads, user, isAdmin, isGerente } = useAuth();
  const { users } = useUsers();

  const [nome, setNome] = useState("");
  const [veiculoInteresse, setVeiculoInteresse] = useState("");
  const [observacao, setObservacao] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  const sellers = useMemo(() => users.filter((currentUser) => currentUser.is_active), [users]);
  const canDelete = isAdmin || isGerente;
  const leadId = lead?.id ?? null;

  const { data: leadRecord, isLoading: leadLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      return apiFetch<any>(dataUrl("lead", { id: leadId }));
    },
    enabled: open && Boolean(leadId),
  });

  const { data: leadStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["lead-status", leadRecord?.Telefone_Whatsapp],
    queryFn: async () => {
      if (!leadRecord?.Telefone_Whatsapp) return null;

      return apiFetch<any>(dataUrl("lead-status", { telefone: leadRecord.Telefone_Whatsapp }));
    },
    enabled: open && Boolean(leadRecord?.Telefone_Whatsapp),
  });

  useEffect(() => {
    if (leadRecord) {
      setNome(leadRecord.nome || "");
    }
  }, [leadRecord]);

  useEffect(() => {
    if (leadStatus) {
      setAssignedTo(leadStatus.assigned_to || null);
      setVeiculoInteresse(leadStatus.veiculo_interesse || "");
      setObservacao(leadStatus.observacao || "");
      return;
    }

    if (open) {
      setAssignedTo(lead?.assigned_to || null);
      setVeiculoInteresse(lead?.leadType && lead.leadType !== "Lead" ? lead.leadType : "");
      setObservacao("");
    }
  }, [leadStatus, lead, open]);

  const updateLeadMutation = useMutation({
    mutationFn: async (payload: { nome: string }) => {
      await apiFetch(dataUrl("lead"), { method: "PATCH", body: { id: leadId, nome: payload.nome } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
    },
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: async (payload: { telefone: string; assignedTo: string | null; veiculoInteresse: string; observacao: string }) => {
      await apiFetch(dataUrl("lead-status"), { method: "PATCH", body: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-status"] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async () => {
      if (!leadRecord) return;

      await apiFetch(dataUrl("lead"), {
        method: "DELETE",
        body: { id: leadRecord.id, telefone: leadRecord.Telefone_Whatsapp },
      });
    },
    onSuccess: () => {
      toast({ title: "Lead apagado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Não foi possível apagar. Tente novamente.", variant: "destructive" });
    },
  });

  const handleSave = async () => {
    if (!leadRecord) return;

    try {
      await updateLeadMutation.mutateAsync({ nome });

      if (leadRecord.Telefone_Whatsapp) {
        const newAssignedTo = user?.id || assignedTo;
        setAssignedTo(newAssignedTo);

        await updateLeadStatusMutation.mutateAsync({
          telefone: leadRecord.Telefone_Whatsapp,
          assignedTo: newAssignedTo,
          veiculoInteresse,
          observacao,
        });
      }

      toast({
        title: "Salvo",
        description: "Informações do lead atualizadas com sucesso.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao salvar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleAssign = async (newAssignedTo: string | null) => {
    if (!leadRecord?.Telefone_Whatsapp) return;

    setAssignedTo(newAssignedTo);

    try {
      await updateLeadStatusMutation.mutateAsync({
        telefone: leadRecord.Telefone_Whatsapp,
        assignedTo: newAssignedTo,
        veiculoInteresse,
        observacao,
      });
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao atribuir responsável. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isBusy = updateLeadMutation.isPending || updateLeadStatusMutation.isPending || deleteLeadMutation.isPending;
  const isInitialLoading = leadLoading || statusLoading;
  const initials = (nome || lead?.nome || "Sem nome")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SL";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[72rem] border-white/[0.06] bg-transparent p-0 shadow-none sm:rounded-[28px]">
        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(160deg,rgba(14,20,36,0.98),rgba(8,12,24,0.96))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_left,rgba(168,85,247,0.12),transparent_24%)]" />

          <DialogHeader className="relative border-b border-white/[0.06] px-7 pb-5 pt-7">
            <div className="flex flex-col gap-5 pr-10 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-primary/20 bg-primary/10 text-lg font-semibold text-foreground shadow-[0_12px_30px_rgba(59,130,246,0.18)]">
                  {initials}
                </div>

                <div className="space-y-2 text-left">
                  <DialogTitle className="text-2xl font-semibold text-foreground">
                    {nome || lead?.nome || "Sem nome"}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                      <MessageCircleMore className="h-4 w-4 text-emerald-400" />
                      {formatBrazilianPhone(leadRecord?.Telefone_Whatsapp || lead?.telefone) || "Sem telefone"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                      <CalendarDays className="h-4 w-4 text-blue-300" />
                      {leadRecord?.created_at ? format(new Date(leadRecord.created_at), "dd/MM/yyyy 'às' HH:mm") : "Data indisponível"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                      <Sparkles className="h-4 w-4 text-violet-300" />
                      Pipeline CRM
                    </span>
                  </DialogDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="rounded-xl border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-red-100">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Apagar Lead
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-subtle border-white/[0.08]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apagar lead</AlertDialogTitle>
                        <AlertDialogDescription>
                          Essa ação remove o lead do pipeline e não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteLeadMutation.mutate()}>
                          Apagar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <Button
                  onClick={handleSave}
                  disabled={isBusy || isInitialLoading}
                  className="rounded-xl bg-gradient-to-r from-primary to-blue-400 border-0 hover:shadow-lg hover:shadow-primary/20"
                >
                  {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar alterações
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="relative max-h-[72vh] overflow-y-auto px-7 py-7">
            {isInitialLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !leadRecord ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                Lead não encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card className="glass rounded-[24px] border-white/[0.05] p-5">
                  <h2 className="mb-5 text-lg font-semibold text-foreground">Informações principais</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="lead-modal-nome" className="text-foreground">Nome</Label>
                      <Input
                        id="lead-modal-nome"
                        value={nome}
                        onChange={(event) => setNome(event.target.value)}
                        className="mt-2 rounded-xl border-white/[0.06] bg-white/[0.03]"
                      />
                    </div>

                    <div>
                      <Label className="text-foreground">Telefone WhatsApp</Label>
                      <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                        {formatBrazilianPhone(leadRecord.Telefone_Whatsapp) || "Sem telefone"}
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-foreground">
                        <Shield className="h-4 w-4 text-blue-300" />
                        Responsável atual
                      </Label>

                      {canAssignLeads ? (
                        <Select
                          value={assignedTo || "none"}
                          onValueChange={(value) => handleAssign(value === "none" ? null : value)}
                          disabled={updateLeadStatusMutation.isPending}
                        >
                          <SelectTrigger className="mt-2 rounded-xl border-white/[0.06] bg-white/[0.03]">
                            <SelectValue placeholder="Selecionar responsável" />
                          </SelectTrigger>
                          <SelectContent className="border-white/[0.08] bg-card">
                            <SelectItem value="none">Sem responsável</SelectItem>
                            {sellers.map((seller) => (
                              <SelectItem key={seller.id} value={seller.id}>
                                {seller.full_name || seller.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                          {lead?.assignedUserName || "Sem responsável"}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="glass rounded-[24px] border-white/[0.05] p-5">
                  <h2 className="mb-5 text-lg font-semibold text-foreground">Veículo de interesse</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="lead-modal-veiculo" className="text-foreground">Descrição</Label>
                      <Textarea
                        id="lead-modal-veiculo"
                        value={veiculoInteresse}
                        onChange={(event) => setVeiculoInteresse(event.target.value)}
                        placeholder="Ex: Onix 2020 branco, SUV até 90 mil, financiamento parcial..."
                        className="mt-2 min-h-[160px] rounded-xl border-white/[0.06] bg-white/[0.03]"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="glass rounded-[24px] border-white/[0.05] p-5 lg:col-span-2">
                  <h2 className="mb-5 text-lg font-semibold text-foreground">Observações internas</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="lead-modal-observacao" className="flex items-center gap-2 text-foreground">
                        <UserCheck className="h-4 w-4 text-violet-300" />
                        Contexto comercial
                      </Label>
                      <Textarea
                        id="lead-modal-observacao"
                        value={observacao}
                        onChange={(event) => setObservacao(event.target.value)}
                        placeholder="Ex: Cliente quer retorno após 18h, aprovou faixa de preço, quer troca no usado..."
                        className="mt-2 min-h-[160px] rounded-xl border-white/[0.06] bg-white/[0.03]"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tudo o que você editar aqui fica salvo no lead sem sair do pipeline.
                    </p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
