import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { apiFetch, dataUrl } from '@/lib/api';

export interface VehicleWithMargin {
  vehicle_id: string;
  title: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  preco: number | null;
  custo_veiculo: number;
  despesas: number;
  observacao: string | null;
  margem_rs: number;
  margem_pct: number;
}

export function useMargens() {
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: margensPayload, isLoading } = useQuery({
    queryKey: ['margens-data'],
    queryFn: () =>
      apiFetch<{
        vehicles: Array<Pick<VehicleWithMargin, 'vehicle_id' | 'title' | 'marca' | 'modelo' | 'ano' | 'preco'>>;
        margens: Array<Pick<VehicleWithMargin, 'vehicle_id' | 'custo_veiculo' | 'despesas' | 'observacao'>>;
      }>(dataUrl('margens')),
  });

  const upsertMutation = useMutation({
    mutationFn: async (params: {
      vehicle_id: string;
      custo_veiculo: number;
      despesas: number;
      observacao: string | null;
    }) => {
      await apiFetch(dataUrl('margem'), { method: 'PATCH', body: params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margens-data'] });
    },
  });

  const debouncedUpsert = useCallback(
    (params: {
      vehicle_id: string;
      custo_veiculo: number;
      despesas: number;
      observacao: string | null;
    }) => {
      const key = params.vehicle_id;
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(() => {
        upsertMutation.mutate(params);
        delete debounceTimers.current[key];
      }, 800);
    },
    [upsertMutation]
  );

  // Merge vehicles with margins
  const merged: VehicleWithMargin[] = (margensPayload?.vehicles || []).map((v) => {
    const m = margensPayload?.margens.find((mg) => mg.vehicle_id === v.vehicle_id);
    const custo = m?.custo_veiculo ?? 0;
    const desp = m?.despesas ?? 0;
    const preco = v.preco ?? 0;
    const margem_rs = preco - (custo + desp);
    const margem_pct = preco > 0 ? (margem_rs / preco) * 100 : 0;

    return {
      vehicle_id: v.vehicle_id,
      title: v.title,
      marca: v.marca,
      modelo: v.modelo,
      ano: v.ano,
      preco: v.preco,
      custo_veiculo: custo,
      despesas: desp,
      observacao: m?.observacao ?? null,
      margem_rs,
      margem_pct,
    };
  });

  return {
    data: merged,
    isLoading,
    debouncedUpsert,
    isSaving: upsertMutation.isPending,
  };
}
