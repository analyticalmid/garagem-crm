import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { apiFetch, dataUrl } from "@/lib/api";

export type NotificationRecord = Database["public"]["Tables"]["notifications"]["Row"];

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => apiFetch<NotificationRecord[]>(dataUrl("notifications")),
  });

  const unreadCount = useMemo(
    () => (notificationsQuery.data || []).filter((notification) => !notification.read_at).length,
    [notificationsQuery.data],
  );

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiFetch(dataUrl("notification-read"), { method: "PATCH", body: { id: notificationId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await apiFetch(dataUrl("notifications-read-all"), { method: "PATCH", body: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  return {
    notifications: notificationsQuery.data || [],
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    markAsRead: markAsRead.mutateAsync,
    markAllAsRead: markAllAsRead.mutateAsync,
    isMarkingAll: markAllAsRead.isPending,
    isMarkingOne: markAsRead.isPending,
  };
}
