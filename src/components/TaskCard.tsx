import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Task, TaskPriority, PRIORITY_LABELS } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, MoreHorizontal, Trash2, AlignLeft } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskCardProps {
  task: Task;
  index: number;
  onClick?: () => void;
  onDelete?: (taskId: string) => void;
  accentColor?: string;
}

const priorityStyles: Record<TaskPriority, string> = {
  alta: "bg-red-400/10 text-red-400 border-red-400/20",
  media: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  baixa: "bg-white/[0.04] text-muted-foreground border-white/[0.06]",
};

export function TaskCard({ task, index, onClick, onDelete, accentColor }: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOverdue =
    task.data_vencimento &&
    isPast(new Date(task.data_vencimento)) &&
    !isToday(new Date(task.data_vencimento)) &&
    task.status !== "concluida" &&
    task.status !== "cancelada";

  const isDueToday =
    task.data_vencimento && isToday(new Date(task.data_vencimento));

  return (
    <>
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={onClick}
            className={`
              relative overflow-hidden rounded-[22px] p-4 cursor-pointer
              transition-all duration-200 group
              ${snapshot.isDragging ? "scale-[1.02] shadow-[0_18px_40px_rgba(0,0,0,0.35)]" : ""}
              ${isOverdue ? "border-red-500/30" : ""}
            `}
            style={{
              background: 'linear-gradient(180deg, rgba(22,28,46,0.98), rgba(12,16,28,0.98))',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: snapshot.isDragging ? '0 24px 50px rgba(0,0,0,0.35)' : '0 12px 30px rgba(0,0,0,0.18)',
            }}
          >
            {onDelete && (
              <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-3 pr-8">
                <div className="mt-0.5 h-9 w-1 rounded-full" style={{ background: accentColor || 'rgba(255,255,255,0.2)' }} />
                <div className="min-w-0 flex-1">
                  <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-foreground">
                    {task.titulo}
                  </h4>
                  {task.descricao && (
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {task.descricao}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {task.responsavel_nome && (
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 truncate">
                    <User className="h-3 w-3 stroke-[1.5] flex-shrink-0" />
                    <span className="truncate">{task.responsavel_nome}</span>
                  </span>
                )}

                {task.data_vencimento && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
                      isOverdue
                        ? "border-red-500/20 bg-red-500/10 text-red-400"
                        : isDueToday
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        : "border-white/[0.06] bg-white/[0.04]"
                    }`}
                  >
                    <Calendar className="h-3 w-3 stroke-[1.5]" />
                    {format(new Date(task.data_vencimento), "dd/MM", {
                      locale: ptBR,
                    })}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                {task.prioridade && (
                  <Badge
                    variant="outline"
                    className={`h-6 rounded-full px-2.5 py-0 text-[10px] font-medium ${priorityStyles[task.prioridade]}`}
                  >
                    {PRIORITY_LABELS[task.prioridade]}
                  </Badge>
                )}

                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <AlignLeft className="h-3.5 w-3.5" />
                  Abrir detalhes
                </span>
              </div>
            </div>

            {accentColor && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
              />
            )}
          </div>
        )}
      </Draggable>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar esta tarefa? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.(task.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
