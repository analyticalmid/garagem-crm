import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { usePrevendaLeadsKanban } from '@/hooks/usePrevendaLeadsKanban';
import { PrevendaKanbanColumn } from '@/components/PrevendaKanbanColumn';
import { PrevendaLeadDetailsModal } from '@/components/PrevendaLeadDetailsModal';
import { PrevendaLead, PrevendaLeadStatus } from '@/types/prevendaLead';

export default function PrevendaLeads() {
  const {
    groupedLeads,
    columns,
    isLoading,
    searchTerm,
    setSearchTerm,
    updateStatus,
    createLead,
    isCreating,
  } = usePrevendaLeadsKanban();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PrevendaLead | null>(null);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const leadId = parseInt(draggableId, 10);
    const newStatus = destination.droppableId as PrevendaLeadStatus;

    updateStatus({ id: leadId, newStatus });
  };

  const handleCreateLead = () => {
    if (!newLeadName.trim() || !newLeadPhone.trim()) return;
    createLead({ nome: newLeadName.trim(), telefone: newLeadPhone.trim() });
    setNewLeadName('');
    setNewLeadPhone('');
    setIsDialogOpen(false);
  };

  const handleLeadClick = (lead: PrevendaLead) => {
    setSelectedLead(lead);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Leads de Prospecção</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie leads de veículos para compra
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:max-w-[36rem]">
          <div className="relative w-full sm:max-w-sm xl:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, marca, modelo, ano, valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-xl border-white/[0.06] bg-white/[0.03] pl-10 focus-visible:ring-primary/20"
            />
          </div>

          <Button onClick={() => setIsDialogOpen(true)} className="h-10 gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-400 hover:shadow-lg hover:shadow-primary/20 transition-all border-0 px-4">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 overflow-hidden rounded-[28px] border border-white/[0.04] bg-black/10">
          <div className="h-full overflow-x-auto overflow-y-hidden scroll-smooth px-1 pb-3 [scrollbar-gutter:stable]">
            <div className="flex h-full min-w-max flex-nowrap gap-5 items-stretch pr-1">
              {columns.map((col) => (
                <PrevendaKanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  color={col.color}
                  leads={groupedLeads[col.id] || []}
                  onLeadClick={handleLeadClick}
                />
              ))}
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Create Lead Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-subtle border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Novo Lead de Prospecção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Nome do lead"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone WhatsApp</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreateLead} disabled={isCreating} className="rounded-xl bg-gradient-to-r from-primary to-blue-400 hover:shadow-lg hover:shadow-primary/20 transition-all border-0">
              {isCreating ? 'Criando...' : 'Criar Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrevendaLeadDetailsModal
        lead={selectedLead}
        open={Boolean(selectedLead)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedLead(null);
          }
        }}
      />
    </div>
  );
}
