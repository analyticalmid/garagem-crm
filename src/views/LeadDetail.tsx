import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, UserCheck, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatBrazilianPhone } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { format } from "date-fns";
import { apiFetch, dataUrl } from "@/lib/api";

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canAssignLeads, user, isAdmin, isGerente } = useAuth();
  const { users } = useUsers();
  const canDelete = isAdmin || isGerente;

  const [nome, setNome] = useState("");
  const [veiculoInteresse, setVeiculoInteresse] = useState("");
  const [observacao, setObservacao] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  // Filter active users (all roles can be assigned as responsible)
  const sellers = users.filter((u) => u.is_active);

  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      return apiFetch<any>(dataUrl("lead", { id: Number(id) }));
    },
  });

  // Fetch lead_status for this lead
  const { data: leadStatus } = useQuery({
    queryKey: ["lead-status", lead?.Telefone_Whatsapp],
    queryFn: async () => {
      if (!lead?.Telefone_Whatsapp) return null;
      return apiFetch<any>(dataUrl("lead-status", { telefone: lead.Telefone_Whatsapp }));
    },
    enabled: !!lead?.Telefone_Whatsapp,
  });


  useEffect(() => {
    if (lead) {
      setNome(lead.nome || "");
    }
  }, [lead]);

  useEffect(() => {
    if (leadStatus) {
      setAssignedTo(leadStatus.assigned_to || null);
      setVeiculoInteresse(leadStatus.veiculo_interesse || "");
      setObservacao(leadStatus.observacao || "");
    }
  }, [leadStatus]);

  const updateLeadMutation = useMutation({
    mutationFn: async (data: { nome: string }) => {
      await apiFetch(dataUrl("lead"), { method: "PATCH", body: { id: Number(id), nome: data.nome } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast({
        title: "Salvo",
        description: "Lead atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ telefone, assignedTo, veiculoInteresse, observacao }: { telefone: string; assignedTo: string | null; veiculoInteresse: string; observacao: string }) => {
      await apiFetch(dataUrl("lead-status"), {
        method: "PATCH",
        body: { telefone, assignedTo, veiculoInteresse, observacao },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-status"] });
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast({
        title: "Salvo",
        description: "Informações do lead atualizadas!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateLeadMutation.mutate({ nome });
    if (lead?.Telefone_Whatsapp) {
      // Automatically assign logged-in user as responsible when editing
      const newAssignedTo = user?.id || assignedTo;
      setAssignedTo(newAssignedTo);
      
      updateLeadStatusMutation.mutate({
        telefone: lead.Telefone_Whatsapp,
        assignedTo: newAssignedTo,
        veiculoInteresse,
        observacao,
      });
    }
  };

  const handleAssign = (newAssignedTo: string | null) => {
    if (!lead?.Telefone_Whatsapp) return;
    setAssignedTo(newAssignedTo);
    updateLeadStatusMutation.mutate({
      telefone: lead.Telefone_Whatsapp,
      assignedTo: newAssignedTo,
      veiculoInteresse,
      observacao,
    });
  };


  if (leadLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          Lead não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-2">
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-muted-foreground">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar Lead
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-subtle border-white/[0.08]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar lead</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja apagar este lead? Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={async () => {
                      try {
                        if (lead?.Telefone_Whatsapp) {
                          await apiFetch(dataUrl("lead"), {
                            method: "DELETE",
                            body: { id: Number(id), telefone: lead.Telefone_Whatsapp },
                          });
                        } else {
                          await apiFetch(dataUrl("lead"), {
                            method: "DELETE",
                            body: { id: Number(id), telefone: null },
                          });
                        }
                        toast({ title: "Lead apagado com sucesso" });
                        queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
                        navigate("/leads");
                      } catch {
                        toast({
                          title: "Não foi possível apagar. Tente novamente.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            onClick={handleSave}
            disabled={updateLeadMutation.isPending}
            className="rounded-xl bg-gradient-to-r from-primary to-blue-400 hover:shadow-lg hover:shadow-primary/20 transition-all border-0"
          >
            {updateLeadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 glass rounded-2xl border-white/[0.05]">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Informações do Lead</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome" className="text-foreground">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 bg-white/[0.03] border-white/[0.06] rounded-xl"
              />
            </div>
            <div>
              <Label className="text-foreground">Telefone WhatsApp</Label>
              <p className="text-sm text-muted-foreground mt-1 py-2 px-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                {formatBrazilianPhone(lead.Telefone_Whatsapp) || "Sem telefone"}
              </p>
            </div>
            <div>
              <Label className="text-foreground">Data de Criação</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {lead.created_at
                  ? format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")
                  : "Data não disponível"}
              </p>
            </div>

            {/* Atribuição de responsável */}
            {canAssignLeads && (
              <div>
                <Label className="text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Responsável
                </Label>
                <Select
                  value={assignedTo || "none"}
                  onValueChange={(value) => handleAssign(value === "none" ? null : value)}
                  disabled={updateLeadStatusMutation.isPending}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Atribuir responsável" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name || seller.email} ({seller.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 glass rounded-2xl border-white/[0.05]">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Veículo de Interesse</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="veiculo-interesse" className="text-foreground">
                Descreva o veículo de interesse
              </Label>
              <Textarea
                id="veiculo-interesse"
                value={veiculoInteresse}
                onChange={(e) => setVeiculoInteresse(e.target.value)}
                placeholder="Ex: Onix 2020 branco, Civic automático, SUV até 80 mil..."
                className="mt-1 min-h-[100px] bg-white/[0.03] border-white/[0.06] rounded-xl"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2 glass rounded-2xl border-white/[0.05]">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Observação do Lead</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao" className="text-foreground">
                Anotações internas sobre o lead
              </Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Cliente prefere ligação após 18h, pediu financiamento..."
                className="mt-1 min-h-[120px] bg-white/[0.03] border-white/[0.06] rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta informação será salva ao clicar em "Salvar"
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LeadDetail;
