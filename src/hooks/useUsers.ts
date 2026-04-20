import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserWithRole, AppRole } from '@/types/auth';
import { apiFetch, dataUrl } from '@/lib/api';

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserWithRole[]>(dataUrl('users')),
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserWithRole> }) => {
      await apiFetch(dataUrl('user-profile'), { method: 'PATCH', body: { id, updates } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      await apiFetch(dataUrl('user-role'), { method: 'PATCH', body: { userId, newRole } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiFetch(dataUrl('user-active'), { method: 'PATCH', body: { id, isActive } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return {
    users,
    isLoading,
    error,
    updateProfile,
    updateRole,
    toggleActive,
  };
}
