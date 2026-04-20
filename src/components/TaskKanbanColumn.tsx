import { Droppable } from "@hello-pangea/dnd";
import { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { ClipboardList } from "lucide-react";

interface TaskKanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

const columnStyles: Record<TaskStatus, { dot: string; cardAccent: string }> = {
  a_fazer: { dot: "bg-[hsl(var(--kanban-afazer))]", cardAccent: "hsl(var(--kanban-afazer))" },
  em_andamento: { dot: "bg-[hsl(var(--kanban-andamento))]", cardAccent: "hsl(var(--kanban-andamento))" },
  concluida: { dot: "bg-[hsl(var(--kanban-concluida))]", cardAccent: "hsl(var(--kanban-concluida))" },
  cancelada: { dot: "bg-[hsl(var(--kanban-cancelada))]", cardAccent: "hsl(var(--kanban-cancelada))" },
};

export function TaskKanbanColumn({
  id,
  title,
  tasks,
  onTaskClick,
  onTaskDelete,
}: TaskKanbanColumnProps) {
  const styles = columnStyles[id];

  return (
    <div className="flex min-w-[310px] max-w-[350px] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/[0.06] shadow-[0_18px_44px_rgba(0,0,0,0.24)]"
      style={{ background: 'linear-gradient(180deg, rgba(16,22,38,0.98), rgba(9,13,24,0.98))' }}
    >
      <div className="border-b border-white/[0.05] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className={`h-2.5 w-2.5 rounded-full pulse-dot ${styles.dot}`} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, tasks.length * 12 + (tasks.length ? 8 : 0))}%`, background: styles.cardAccent }} />
        </div>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-3 px-4 pb-4 pt-4 transition-colors duration-200 ${
              snapshot.isDraggingOver ? "bg-white/[0.03]" : ""
            }`}
          >
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-white/[0.08] bg-white/[0.02] py-12 text-muted-foreground">
                <ClipboardList className="mb-2 h-5 w-5 stroke-[1.5]" />
                <p className="text-xs">Nenhuma tarefa nesta etapa</p>
              </div>
            ) : (
              tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onClick={() => onTaskClick?.(task)}
                  onDelete={onTaskDelete}
                  accentColor={styles.cardAccent}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}