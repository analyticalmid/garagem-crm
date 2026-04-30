import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lead, LeadStatus } from "@/types/lead";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, dataUrl } from "@/lib/api";
import { PipelineColumn } from "@/lib/kanbanColumns";

type LeadsKanbanResponse = {
  leads: Lead[];
  columns: PipelineColumn[];
};

export function useLeadsKanban() {
  const queryClient = useQueryClient();
  const { user, canViewAllLeads } = useAuth();

  // Buscar leads com status calculado
  const { data, isLoading, error } = useQuery({
    queryKey: ["leads-kanban", user?.id, canViewAllLeads],
    queryFn: () => apiFetch<LeadsKanbanResponse>(dataUrl("leads-kanban")),
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Mutation para atualizar status com optimistic update
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      telefone,
      status,
    }: {
      telefone: string;
      status: LeadStatus;
    }) => {
      const payload = {
        telefone,
        status,
        ...(!canViewAllLeads && user?.id ? { assigned_to: user.id } : {}),
      };

      await apiFetch(dataUrl("lead-status"), { method: "PATCH", body: payload });
    },
    onMutate: async ({ telefone, status }) => {
      await queryClient.cancelQueries({ queryKey: ["leads-kanban"] });
      const previousData = queryClient.getQueryData<LeadsKanbanResponse>(["leads-kanban", user?.id, canViewAllLeads]);
      
      queryClient.setQueryData<LeadsKanbanResponse>(["leads-kanban", user?.id, canViewAllLeads], (old) => {
        if (!old) return old;
        return {
          ...old,
          leads: old.leads.map((lead) =>
            lead.telefone === telefone ? { ...lead, status } : lead
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["leads-kanban", user?.id, canViewAllLeads], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
    },
  });

  // Mutation para atribuir lead a um usuário
  const assignLeadMutation = useMutation({
    mutationFn: async ({
      telefone,
      assignedTo,
    }: {
      telefone: string;
      assignedTo: string | null;
    }) => {
      const nextAssignedTo = canViewAllLeads ? assignedTo : user?.id;

      await apiFetch(dataUrl("lead-status"), {
        method: "PATCH",
        body: { telefone, assignedTo: nextAssignedTo },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-kanban"] });
    },
  });

  const leads = data?.leads ?? [];
  const columns = data?.columns ?? [];

  return {
    leads,
    columns,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    assignLead: assignLeadMutation.mutate,
    isAssigning: assignLeadMutation.isPending,
  };
}
