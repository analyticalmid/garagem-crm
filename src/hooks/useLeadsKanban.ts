import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lead, LeadStatus } from "@/types/lead";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, dataUrl } from "@/lib/api";

export function useLeadsKanban() {
  const queryClient = useQueryClient();
  const { user, canViewAllLeads } = useAuth();

  // Buscar leads com status calculado
  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["leads-kanban", user?.id, canViewAllLeads],
    queryFn: () => apiFetch<Lead[]>(dataUrl("leads-kanban")),
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
      const previousLeads = queryClient.getQueryData<Lead[]>(["leads-kanban", user?.id, canViewAllLeads]);
      
      queryClient.setQueryData<Lead[]>(["leads-kanban", user?.id, canViewAllLeads], (old) => {
        if (!old) return old;
        return old.map((lead) =>
          lead.telefone === telefone ? { ...lead, status } : lead
        );
      });

      return { previousLeads };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads-kanban", user?.id, canViewAllLeads], context.previousLeads);
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

  // Agrupar leads por status
  const leadsByStatus = leads.reduce(
    (acc, lead) => {
      acc[lead.status].push(lead);
      return acc;
    },
    {
      novo_lead: [] as Lead[],
      negociando: [] as Lead[],
      vendido: [] as Lead[],
      perdido: [] as Lead[],
    }
  );

  return {
    leads,
    leadsByStatus,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    assignLead: assignLeadMutation.mutate,
    isAssigning: assignLeadMutation.isPending,
  };
}
