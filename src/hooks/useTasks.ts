import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, dataUrl } from "@/lib/api";

export function useTasks() {
  const queryClient = useQueryClient();
  const { user, canAssignLeads } = useAuth();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<Task[]>(dataUrl("tasks")),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      await apiFetch(dataUrl("task"), { method: "PATCH", body: { id: taskId, updates: { status } } });
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks"]);

      queryClient.setQueryData<Task[]>(["tasks"], (old) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === taskId ? { ...task, status } : task
        );
      });

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Erro ao atualizar status da tarefa");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: {
      titulo: string;
      descricao?: string;
      status?: TaskStatus;
      prioridade?: TaskPriority;
      responsavel_id?: string | null;
      responsavel_nome?: string | null;
      data_vencimento?: string | null;
    }) => {
      await apiFetch(dataUrl("task"), { method: "POST", body: {
        titulo: task.titulo,
        descricao: task.descricao || null,
        status: task.status || "a_fazer",
        prioridade: task.prioridade || "media",
        responsavel_id: task.responsavel_id || (canAssignLeads ? null : user?.id || null),
        responsavel_nome: task.responsavel_nome || null,
        data_vencimento: task.data_vencimento || null,
      }});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar tarefa");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { 
      taskId: string; 
      updates: Partial<Task> 
    }) => {
      await apiFetch(dataUrl("task"), { method: "PATCH", body: { id: taskId, updates } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar tarefa");
    },
  });

  // Agrupar tarefas por status
  const tasksByStatus = {
    a_fazer: tasks.filter((t) => t.status === "a_fazer"),
    em_andamento: tasks.filter((t) => t.status === "em_andamento"),
    concluida: tasks.filter((t) => t.status === "concluida"),
    cancelada: tasks.filter((t) => t.status === "cancelada"),
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiFetch(dataUrl("task"), { method: "DELETE", body: { id: taskId } });
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks"]);

      queryClient.setQueryData<Task[]>(["tasks"], (old) => {
        if (!old) return old;
        return old.filter((task) => task.id !== taskId);
      });

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
      toast.error("Erro ao excluir tarefa");
    },
    onSuccess: () => {
      toast.success("Tarefa excluída com sucesso!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    tasks,
    tasksByStatus,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    createTask: createTaskMutation.mutate,
    isCreating: createTaskMutation.isPending,
    updateTask: updateTaskMutation.mutate,
    isUpdatingTask: updateTaskMutation.isPending,
    deleteTask: deleteTaskMutation.mutate,
    isDeleting: deleteTaskMutation.isPending,
  };
}
