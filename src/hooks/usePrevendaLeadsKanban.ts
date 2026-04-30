import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PrevendaLead, PrevendaLeadStatus } from '@/types/prevendaLead';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, dataUrl } from '@/lib/api';
import { buildPipelineGroups, PipelineColumn } from '@/lib/kanbanColumns';

type PrevendaLeadsResponse = {
  leads: PrevendaLead[];
  columns: PipelineColumn[];
};

export function usePrevendaLeadsKanban() {
  const { toast } = useToast();
  const { user, canViewAllLeads } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch profiles for user names
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => apiFetch<{ id: string; full_name: string | null; email: string | null }[]>(dataUrl('profiles-active')),
  });

  // Fetch prevenda leads
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['prevenda-leads'],
    staleTime: 45 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => apiFetch<PrevendaLeadsResponse>(dataUrl('prevenda-leads')),
  });
  const rawLeads = data?.leads ?? [];
  const columns = data?.columns ?? [];

  // Map leads with assigned user names
  const leads: PrevendaLead[] = useMemo(() => {
    return rawLeads.map((lead) => {
      const assignedProfile = profiles.find(p => p.id === lead.assigned_to);
      return {
        id: lead.id,
        nome: lead.nome,
        telefone_whatsapp: lead.telefone_whatsapp,
        created_at: lead.created_at,
        status: (lead.status as PrevendaLeadStatus) || 'novo_lead',
        assigned_to: lead.assigned_to,
        assignedUserName: assignedProfile?.full_name || assignedProfile?.email || null,
        observacao: lead.observacao,
        veiculo_nome: lead.veiculo_nome,
        veiculo_marca: lead.veiculo_marca,
        veiculo_modelo: lead.veiculo_modelo,
        veiculo_km: lead.veiculo_km,
        veiculo_cambio: lead.veiculo_cambio,
        veiculo_ano_fab: lead.veiculo_ano_fab,
        veiculo_ano_mod: lead.veiculo_ano_mod,
        veiculo_valor: lead.veiculo_valor,
        updated_at: lead.updated_at,
      };
    });
  }, [rawLeads, profiles]);

  // Filter by search
  const filteredLeads = useMemo(() => {
    if (!debouncedSearch.trim()) return leads;
    const term = debouncedSearch.toLowerCase().replace(/[^\d\w]/g, '');
    return leads.filter(lead => {
      const fields = [
        lead.nome,
        lead.telefone_whatsapp,
        lead.veiculo_nome,
        lead.veiculo_marca,
        lead.veiculo_modelo,
        lead.veiculo_cambio,
        lead.observacao,
        lead.veiculo_ano_fab?.toString(),
        lead.veiculo_ano_mod?.toString(),
        lead.veiculo_valor?.toString(),
        lead.veiculo_km?.toString(),
      ];
      return fields.some(f => (f || '').toLowerCase().replace(/[^\d\w]/g, '').includes(term));
    });
  }, [leads, debouncedSearch]);

  // Group by status
  const groupedLeads = useMemo(() => buildPipelineGroups(filteredLeads, columns), [columns, filteredLeads]);

  // Update status mutation with optimistic UI
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: PrevendaLeadStatus }) => {
      await apiFetch(dataUrl('prevenda-status'), { method: 'PATCH', body: { id, status: newStatus } });
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['prevenda-leads'] });
      const previousData = queryClient.getQueryData<PrevendaLeadsResponse>(['prevenda-leads']);
      
      queryClient.setQueryData<PrevendaLeadsResponse>(['prevenda-leads'], (old) =>
        old
          ? {
              ...old,
              leads: old.leads.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead)),
            }
          : old
      );
      
      return { previousData };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['prevenda-leads'], context?.previousData);
      toast({
        title: 'Erro ao mover lead',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Lead movido',
        description: 'Status atualizado com sucesso.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['prevenda-leads'] });
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async ({ nome, telefone }: { nome: string; telefone: string }) => {
      await apiFetch(dataUrl('prevenda-lead'), { method: 'POST', body: { nome, telefone } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prevenda-leads'] });
      toast({
        title: 'Lead criado',
        description: 'Novo lead adicionado ao pipeline.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao criar lead',
        description: 'Não foi possível criar o lead.',
        variant: 'destructive',
      });
    },
  });

  return {
    leads: filteredLeads,
    groupedLeads,
    columns,
    isLoading,
    searchTerm,
    setSearchTerm,
    updateStatus: updateStatusMutation.mutate,
    createLead: createLeadMutation.mutate,
    isCreating: createLeadMutation.isPending,
    refetch,
    profiles,
  };
}
