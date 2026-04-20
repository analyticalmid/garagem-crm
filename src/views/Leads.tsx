import { useState, useEffect, useMemo } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useLeadsKanban } from "@/hooks/useLeadsKanban";
import { KanbanColumn } from "@/components/KanbanColumn";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { SaleCelebration } from "@/components/SaleCelebration";
import { KANBAN_COLUMNS, LeadStatus, Lead } from "@/types/lead";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { apiFetch, dataUrl } from "@/lib/api";

const Leads = () => {
  const { profile } = useAuth();
  const { leadsByStatus, isLoading, updateStatus, leads } = useLeadsKanban();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const [open, setOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saleCelebrationOpen, setSaleCelebrationOpen] = useState(false);
  const [celebrationLeadName, setCelebrationLeadName] = useState<string | null>(null);
  
  // Search state with debounce — initialized from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");

  // Debounce effect (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!saleCelebrationOpen) return;

    const timer = window.setTimeout(() => {
      setSaleCelebrationOpen(false);
      setCelebrationLeadName(null);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [saleCelebrationOpen]);

  // Filter function
  const filterLeads = (leadsToFilter: Lead[]) => {
    if (!debouncedSearch.trim()) return leadsToFilter;
    
    const searchLower = debouncedSearch.toLowerCase().trim();
    return leadsToFilter.filter((lead) => {
      const nomeMatch = lead.nome?.toLowerCase().includes(searchLower);
      const telefoneMatch = lead.telefone?.toLowerCase().includes(searchLower);
      return nomeMatch || telefoneMatch;
    });
  };

  // Filtered leads by status
  const filteredLeadsByStatus = useMemo(() => ({
    novo_lead: filterLeads(leadsByStatus.novo_lead),
    negociando: filterLeads(leadsByStatus.negociando),
    vendido: filterLeads(leadsByStatus.vendido),
    perdido: filterLeads(leadsByStatus.perdido),
  }), [leadsByStatus, debouncedSearch]);

  // Check if there are any results
  const hasResults = useMemo(() => 
    Object.values(filteredLeadsByStatus).some(col => col.length > 0),
    [filteredLeadsByStatus]
  );

  const createLeadMutation = useMutation({
    mutationFn: async (data: { nome: string; Telefone_Whatsapp: string }) => {
      await apiFetch(dataUrl("lead"), { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
      toast.success("Lead criado com sucesso!");
      setOpen(false);
      setNome("");
      setTelefone("");
    },
    onError: () => {
      toast.error("Erro ao criar lead");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    createLeadMutation.mutate({ nome: nome.trim(), Telefone_Whatsapp: telefone.trim() });
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside
    if (!destination) return;

    // Same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as LeadStatus;
    const lead = leads.find((l) => String(l.id) === draggableId);

    if (!lead || !lead.telefone) {
      toast.error("Lead sem telefone não pode ser movido");
      return;
    }

    // Salvar status manual (optimistic update já move o card)
    updateStatus({ telefone: lead.telefone, status: newStatus });

    if (newStatus === "vendido" && source.droppableId !== "vendido") {
      setCelebrationLeadName(lead.nome || null);
      setSaleCelebrationOpen(true);
      toast.success(profile?.full_name ? `Parabéns, ${profile.full_name}!` : "Parabéns pela venda!", {
        description: lead.nome
          ? `${lead.nome} foi movido para Vendido.`
          : "O lead foi movido para Vendido.",
      });
      return;
    }

    toast.success(`Lead movido para "${KANBAN_COLUMNS.find(c => c.id === newStatus)?.title}"`);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SaleCelebration open={saleCelebrationOpen} leadName={celebrationLeadName} sellerName={profile?.full_name || null} />

      <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Pipeline de Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Arraste os cards para mover leads entre as etapas
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:max-w-[34rem]">
          <div className="relative w-full sm:max-w-sm xl:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-xl border-white/[0.06] bg-white/[0.03] pl-10 focus-visible:border-primary/30 focus-visible:ring-primary/20"
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 rounded-xl bg-gradient-to-r from-primary to-blue-400 border-0 px-4 hover:shadow-lg hover:shadow-primary/20 transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-white/[0.06] bg-card">
              <DialogHeader>
                <DialogTitle>Criar Novo Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    placeholder="Nome do lead"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="rounded-xl bg-white/[0.04] border-white/[0.08] focus-visible:ring-primary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">WhatsApp</Label>
                  <Input
                    id="telefone"
                    placeholder="+55 11 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="rounded-xl bg-white/[0.04] border-white/[0.08] focus-visible:ring-primary/30"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-white/[0.08] hover:bg-white/[0.04]">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createLeadMutation.isPending} className="rounded-xl bg-gradient-to-r from-primary to-blue-400 border-0">
                    {createLeadMutation.isPending ? "Criando..." : "Criar Lead"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board */}
      {!hasResults && debouncedSearch ? (
        <div className="flex-1 min-h-0 flex items-center justify-center text-center text-muted-foreground py-12">
          Nenhum lead encontrado
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0 overflow-hidden rounded-[28px] border border-white/[0.04] bg-black/10">
            <div className="h-full overflow-x-auto overflow-y-hidden scroll-smooth px-1 pb-3 [scrollbar-gutter:stable]">
              <div className="flex h-full min-w-max flex-nowrap gap-5 items-stretch pr-1">
                {KANBAN_COLUMNS.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    id={column.id}
                    title={column.title}
                    leads={filteredLeadsByStatus[column.id]}
                    colorClass={column.color}
                    onLeadClick={handleLeadClick}
                  />
                ))}
              </div>
            </div>
          </div>
        </DragDropContext>
      )}

      <LeadDetailsModal
        lead={selectedLead}
        open={Boolean(selectedLead)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedLead(null);
          }
        }}
      />
      </div>
    </>
  );
};

export default Leads;
