import { useState, useMemo } from "react";
import { toast } from "sonner";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useTasks } from "@/hooks/useTasks";
import { useUsers } from "@/hooks/useUsers";
import { TaskKanbanColumn } from "@/components/TaskKanbanColumn";
import { TaskFormModal } from "@/components/TaskFormModal";
import { Task, TaskStatus, TaskPriority, TASK_COLUMNS } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, SlidersHorizontal, X, Sparkles, CheckCheck, Clock3, AlertTriangle, UserRound } from "lucide-react";
import { isPast, isToday } from "date-fns";

export default function Tarefas() {
  const {
    tasksByStatus,
    isLoading,
    updateStatus,
    createTask,
    isCreating,
    updateTask,
    isUpdatingTask,
    deleteTask,
  } = useTasks();
  const { users } = useUsers();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("all");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar tarefas
  const filteredTasksByStatus = useMemo(() => {
    const filterTasks = (tasks: Task[]) => {
      return tasks.filter((task) => {
        const matchesSearch =
          !searchTerm ||
          task.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.descricao?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesResponsavel =
          filterResponsavel === "all" ||
          task.responsavel_id === filterResponsavel;

        const matchesPrioridade =
          filterPrioridade === "all" || task.prioridade === filterPrioridade;

        return matchesSearch && matchesResponsavel && matchesPrioridade;
      });
    };

    return {
      a_fazer: filterTasks(tasksByStatus.a_fazer),
      em_andamento: filterTasks(tasksByStatus.em_andamento),
      concluida: filterTasks(tasksByStatus.concluida),
      cancelada: filterTasks(tasksByStatus.cancelada),
    };
  }, [tasksByStatus, searchTerm, filterResponsavel, filterPrioridade]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    updateStatus({ taskId: draggableId, status: newStatus });
    
    const columnTitle = TASK_COLUMNS.find((c) => c.id === newStatus)?.title;
    toast.success(`Tarefa movida para "${columnTitle}"`);
  };

  const handleSubmit = (taskData: {
    titulo: string;
    descricao?: string;
    status?: TaskStatus;
    prioridade?: TaskPriority;
    responsavel_id?: string | null;
    responsavel_nome?: string | null;
    data_vencimento?: string | null;
  }) => {
    if (editingTask) {
      updateTask({
        taskId: editingTask.id,
        updates: taskData,
      });
    } else {
      createTask(taskData);
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const hasActiveFilters = filterResponsavel !== "all" || filterPrioridade !== "all";

  const totalTasks = useMemo(
    () => Object.values(filteredTasksByStatus).reduce((sum, tasks) => sum + tasks.length, 0),
    [filteredTasksByStatus],
  );

  const overdueTasks = useMemo(
    () => Object.values(filteredTasksByStatus)
      .flat()
      .filter(
        (task) =>
          task.data_vencimento &&
          isPast(new Date(task.data_vencimento)) &&
          !isToday(new Date(task.data_vencimento)) &&
          task.status !== "concluida" &&
          task.status !== "cancelada",
      ).length,
    [filteredTasksByStatus],
  );

  const todayTasks = useMemo(
    () => Object.values(filteredTasksByStatus)
      .flat()
      .filter((task) => task.data_vencimento && isToday(new Date(task.data_vencimento))).length,
    [filteredTasksByStatus],
  );

  const assignedTasks = useMemo(
    () => Object.values(filteredTasksByStatus).flat().filter((task) => task.responsavel_id).length,
    [filteredTasksByStatus],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-white/[0.06] bg-[linear-gradient(145deg,rgba(10,18,34,0.98),rgba(7,11,23,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_left,rgba(139,92,246,0.10),transparent_28%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              Mesa Operacional
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tarefas</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Acompanhe prioridades, vencimentos e responsáveis com uma visão mais editorial do kanban, focada em ritmo, clareza e execução diária.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Volume</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{totalTasks} tarefas no recorte</p>
                <p className="mt-1 text-sm text-blue-300">Busca e filtros já aplicados</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Concluídas</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{filteredTasksByStatus.concluida.length} entregas</p>
                <p className="mt-1 text-sm text-emerald-300">Cards finalizados no quadro</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Atenção</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{overdueTasks} vencidas</p>
                <p className="mt-1 text-sm text-amber-300">Demandas pedindo ação imediata</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:w-[430px]">
            <div className="rounded-[24px] border border-blue-500/10 bg-gradient-to-br from-blue-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
                  <CheckCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total em tela</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{totalTasks}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-amber-500/10 bg-gradient-to-br from-amber-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-300">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Vencem hoje</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{todayTasks}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-red-500/10 bg-gradient-to-br from-red-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Em risco</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{overdueTasks}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-violet-500/10 bg-gradient-to-br from-violet-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Com responsável</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{assignedTasks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Painel de execução</h2>
          <p className="text-sm text-muted-foreground">Filtre por responsável, prioridade e mova cards no fluxo com mais clareza visual.</p>
        </div>

        <Button onClick={handleNewTask} className="gap-2 rounded-2xl bg-[linear-gradient(135deg,#22c55e,#38bdf8)] px-5 text-slate-950 hover:shadow-[0_16px_40px_rgba(34,197,94,0.28)] transition-all border-0">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      <div className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(15,21,37,0.96),rgba(10,14,26,0.96))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 rounded-2xl border-white/[0.08] bg-white/[0.03] pl-10"
            />
          </div>

          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground ${
              hasActiveFilters ? "text-foreground" : ""
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-wrap items-end gap-4 rounded-[24px] border border-white/[0.06] bg-white/[0.025] p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
                <SelectTrigger className="h-11 w-[220px] rounded-2xl border-white/[0.08] bg-white/[0.03]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
              <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
                <SelectTrigger className="h-11 w-[170px] rounded-2xl border-white/[0.08] bg-white/[0.03]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterResponsavel("all");
                  setFilterPrioridade("all");
                }}
                className="h-11 gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-5 overflow-x-auto pb-4">
          {TASK_COLUMNS.map((column) => (
            <TaskKanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={filteredTasksByStatus[column.id]}
              onTaskClick={handleTaskClick}
              onTaskDelete={deleteTask}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Modal de criação/edição */}
      <TaskFormModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingTask(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdatingTask}
        initialData={editingTask}
      />
    </div>
  );
}