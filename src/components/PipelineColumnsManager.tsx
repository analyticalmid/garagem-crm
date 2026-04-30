import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Edit3, Loader2, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, dataUrl } from "@/lib/api";
import { PipelineColumn, PipelineKey } from "@/lib/kanbanColumns";
import { useToast } from "@/hooks/use-toast";

type Props = {
  pipelineKey: PipelineKey;
  columns: PipelineColumn[];
  disabled?: boolean;
};

function pipelineLabel(pipelineKey: PipelineKey) {
  return pipelineKey === "leads" ? "Leads" : "Pré-venda";
}

export function PipelineColumnsManager({ pipelineKey, columns, disabled = false }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>({});
  const [removeColumnKey, setRemoveColumnKey] = useState<string | null>(null);
  const [destinationKey, setDestinationKey] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setDraftTitles(
      columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.key] = column.title;
        return acc;
      }, {}),
    );
  }, [columns, open]);

  const refreshQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
    queryClient.invalidateQueries({ queryKey: ["prevenda-leads"] });
    queryClient.invalidateQueries({ queryKey: ["pipeline-columns", pipelineKey] });
  };

  const createColumnMutation = useMutation({
    mutationFn: async (title: string) => {
      await apiFetch(dataUrl("pipeline-column"), {
        method: "POST",
        body: { pipeline: pipelineKey, title },
      });
    },
    onSuccess: () => {
      setNewTitle("");
      refreshQueries();
      toast({ title: "Coluna criada", description: "A nova etapa já está disponível no pipeline." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar coluna", description: error.message, variant: "destructive" });
    },
  });

  const renameColumnMutation = useMutation({
    mutationFn: async ({ key, title }: { key: string; title: string }) => {
      await apiFetch(dataUrl("pipeline-column"), {
        method: "PATCH",
        body: { pipeline: pipelineKey, action: "rename", key, title },
      });
    },
    onSuccess: () => {
      refreshQueries();
      toast({ title: "Nome atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao renomear coluna", description: error.message, variant: "destructive" });
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: async (columnKeys: string[]) => {
      await apiFetch(dataUrl("pipeline-columns-reorder"), {
        method: "PATCH",
        body: { pipeline: pipelineKey, columnKeys },
      });
    },
    onSuccess: () => {
      refreshQueries();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao reordenar colunas", description: error.message, variant: "destructive" });
    },
  });

  const removeColumnMutation = useMutation({
    mutationFn: async ({ key, targetKey }: { key: string; targetKey: string }) => {
      await apiFetch(dataUrl("pipeline-column"), {
        method: "DELETE",
        body: { pipeline: pipelineKey, key, destinationKey: targetKey },
      });
    },
    onSuccess: () => {
      setRemoveColumnKey(null);
      setDestinationKey("");
      refreshQueries();
      toast({ title: "Coluna removida", description: "Os cards foram remanejados com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover coluna", description: error.message, variant: "destructive" });
    },
  });

  const removeCandidates = useMemo(() => columns.filter((column) => column.key !== removeColumnKey), [columns, removeColumnKey]);

  useEffect(() => {
    if (!removeColumnKey) return;
    setDestinationKey(removeCandidates[0]?.key ?? "");
  }, [removeCandidates, removeColumnKey]);

  const isBusy =
    createColumnMutation.isPending ||
    renameColumnMutation.isPending ||
    reorderColumnsMutation.isPending ||
    removeColumnMutation.isPending;

  const moveColumn = (columnKey: string, direction: -1 | 1) => {
    const currentIndex = columns.findIndex((column) => column.key === columnKey);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= columns.length) return;

    const nextOrder = [...columns];
    const [movedColumn] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(nextIndex, 0, movedColumn);
    void reorderColumnsMutation.mutate(nextOrder.map((column) => column.key));
  };

  return (
    <>
      <Button
        variant="outline"
        className="h-10 rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Settings2 className="mr-2 h-4 w-4" />
        Gerenciar colunas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-white/[0.08] bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(9,13,24,0.98))]">
          <DialogHeader>
            <DialogTitle>Colunas do pipeline de {pipelineLabel(pipelineKey)}</DialogTitle>
            <DialogDescription>
              No plano Essencial você pode adicionar, renomear, reordenar e remover etapas sem perder os cards já existentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <Label htmlFor={`new-column-${pipelineKey}`}>Nova coluna</Label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Input
                  id={`new-column-${pipelineKey}`}
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Ex: Follow-up, Proposta, Retomada"
                  className="rounded-xl border-white/[0.08] bg-white/[0.04]"
                />
                <Button
                  onClick={() => createColumnMutation.mutate(newTitle.trim())}
                  disabled={isBusy || !newTitle.trim()}
                  className="rounded-xl bg-gradient-to-r from-primary to-blue-400 border-0"
                >
                  {createColumnMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {columns.map((column, index) => {
                const draftTitle = draftTitles[column.key] ?? column.title;
                const hasChanged = draftTitle.trim() !== column.title;

                return (
                  <div key={column.key} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
                        <Input
                          value={draftTitle}
                          onChange={(event) =>
                            setDraftTitles((current) => ({
                              ...current,
                              [column.key]: event.target.value,
                            }))
                          }
                          className="rounded-xl border-white/[0.08] bg-white/[0.04]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl border-white/[0.08] bg-white/[0.03]"
                          onClick={() => moveColumn(column.key, -1)}
                          disabled={isBusy || index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl border-white/[0.08] bg-white/[0.03]"
                          onClick={() => moveColumn(column.key, 1)}
                          disabled={isBusy || index === columns.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl border-white/[0.08] bg-white/[0.03]"
                          onClick={() => renameColumnMutation.mutate({ key: column.key, title: draftTitle.trim() })}
                          disabled={isBusy || !draftTitle.trim() || !hasChanged}
                        >
                          <Edit3 className="mr-2 h-4 w-4" />
                          Salvar nome
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-red-100"
                          onClick={() => setRemoveColumnKey(column.key)}
                          disabled={isBusy || columns.length < 2}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-white/[0.08] bg-white/[0.03]" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removeColumnKey)} onOpenChange={(nextOpen) => !nextOpen && setRemoveColumnKey(null)}>
        <DialogContent className="border-white/[0.08] bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(9,13,24,0.98))]">
          <DialogHeader>
            <DialogTitle>Remover coluna</DialogTitle>
            <DialogDescription>
              Escolha a coluna de destino para mover os cards antes de concluir a remoção.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label>Enviar cards para</Label>
            <Select value={destinationKey} onValueChange={setDestinationKey}>
              <SelectTrigger className="rounded-xl border-white/[0.08] bg-white/[0.04]">
                <SelectValue placeholder="Selecione a coluna de destino" />
              </SelectTrigger>
              <SelectContent>
                {removeCandidates.map((column) => (
                  <SelectItem key={column.key} value={column.key}>
                    {column.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-white/[0.08] bg-white/[0.03]" onClick={() => setRemoveColumnKey(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-red-600 hover:bg-red-700"
              disabled={removeColumnMutation.isPending || !removeColumnKey || !destinationKey}
              onClick={() => removeColumnMutation.mutate({ key: removeColumnKey, targetKey: destinationKey })}
            >
              {removeColumnMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remover coluna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
