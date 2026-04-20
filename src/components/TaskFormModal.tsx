import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task, TaskStatus, TaskPriority, TASK_COLUMNS } from "@/types/task";
import { useUsers } from "@/hooks/useUsers";
import { Loader2, Sparkles } from "lucide-react";

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: {
    titulo: string;
    descricao?: string;
    status?: TaskStatus;
    prioridade?: TaskPriority;
    responsavel_id?: string | null;
    responsavel_nome?: string | null;
    data_vencimento?: string | null;
  }) => void;
  isSubmitting?: boolean;
  initialData?: Task | null;
}

export function TaskFormModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialData,
}: TaskFormModalProps) {
  const { users } = useUsers();
  const fieldClassName = "h-11 rounded-2xl border-white/[0.08] bg-white/[0.03] text-foreground placeholder:text-muted-foreground/70";
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<TaskStatus>("a_fazer");
  const [prioridade, setPrioridade] = useState<TaskPriority>("media");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [dataVencimento, setDataVencimento] = useState("");

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitulo(initialData.titulo);
        setDescricao(initialData.descricao || "");
        setStatus(initialData.status);
        setPrioridade(initialData.prioridade || "media");
        setResponsavelId(initialData.responsavel_id || "");
        setDataVencimento(initialData.data_vencimento || "");
      } else {
        setTitulo("");
        setDescricao("");
        setStatus("a_fazer");
        setPrioridade("media");
        setResponsavelId("");
        setDataVencimento("");
      }
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const selectedUser = users?.find((u) => u.id === responsavelId);

    onSubmit({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      status,
      prioridade,
      responsavel_id: responsavelId || null,
      responsavel_nome: selectedUser?.full_name || null,
      data_vencimento: dataVencimento || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] overflow-hidden border-white/[0.08] bg-[linear-gradient(180deg,rgba(14,19,33,0.98),rgba(10,14,26,0.98))] p-0 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <DialogHeader>
          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              Task Studio
            </div>
            <DialogTitle className="mt-4 text-xl text-foreground">
              {initialData ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Estruture título, prioridade, responsável e vencimento em um fluxo mais limpo e rápido de operar.
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Digite o título da tarefa"
                required
                className={fieldClassName}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes da tarefa (opcional)"
                rows={4}
                className="min-h-[110px] rounded-2xl border-white/[0.08] bg-white/[0.03]"
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                    <SelectTrigger className={fieldClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_COLUMNS.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TaskPriority)}>
                    <SelectTrigger className={fieldClassName}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={responsavelId || "none"} onValueChange={(v) => setResponsavelId(v === "none" ? "" : v)}>
                    <SelectTrigger className={fieldClassName}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !titulo.trim()} className="rounded-2xl bg-[linear-gradient(135deg,#22c55e,#38bdf8)] text-slate-950 hover:shadow-[0_16px_40px_rgba(34,197,94,0.28)] transition-all border-0">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Salvar" : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
