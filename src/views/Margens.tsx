import { useState, useMemo } from 'react';
import { useMargens, VehicleWithMargin } from '@/hooks/useMargens';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Car, AlertTriangle, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseCurrency = (raw: string): number => {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export default function Margens() {
  const { data, isLoading, debouncedUpsert } = useMargens();
  const { isAdmin, isGerente } = useAuth();
  const canEdit = isAdmin || isGerente;

  const [brandFilter, setBrandFilter] = useState('all');
  const [marginFilter, setMarginFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<VehicleWithMargin>>>({});

  const getLocal = (vehicle: VehicleWithMargin) => ({
    custo_veiculo: localEdits[vehicle.vehicle_id]?.custo_veiculo ?? vehicle.custo_veiculo,
    despesas: localEdits[vehicle.vehicle_id]?.despesas ?? vehicle.despesas,
    observacao: localEdits[vehicle.vehicle_id]?.observacao ?? vehicle.observacao,
  });

  const handleChange = (vehicle: VehicleWithMargin, field: 'custo_veiculo' | 'despesas' | 'observacao', value: string) => {
    const numericValue = field === 'observacao' ? 0 : parseCurrency(value);
    const local = getLocal(vehicle);
    const updated = { ...local, [field]: field === 'observacao' ? value : numericValue };

    setLocalEdits((previous) => ({ ...previous, [vehicle.vehicle_id]: updated }));

    debouncedUpsert({
      vehicle_id: vehicle.vehicle_id,
      custo_veiculo: field === 'custo_veiculo' ? numericValue : (updated.custo_veiculo as number),
      despesas: field === 'despesas' ? numericValue : (updated.despesas as number),
      observacao: field === 'observacao' ? value : (updated.observacao as string | null),
    });
  };

  const brands = useMemo(() => {
    const set = new Set(data.map((vehicle) => vehicle.marca).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let items = data.map((vehicle) => {
      const local = getLocal(vehicle);
      const custo = local.custo_veiculo as number;
      const despesas = local.despesas as number;
      const preco = vehicle.preco ?? 0;
      const margem_rs = preco - (custo + despesas);
      const margem_pct = preco > 0 ? (margem_rs / preco) * 100 : 0;

      return {
        ...vehicle,
        custo_veiculo: custo,
        despesas,
        observacao: local.observacao as string | null,
        margem_rs,
        margem_pct,
      };
    });

    if (brandFilter !== 'all') items = items.filter((vehicle) => vehicle.marca === brandFilter);
    if (marginFilter === 'positive') items = items.filter((vehicle) => vehicle.margem_rs > 0);
    if (marginFilter === 'negative') items = items.filter((vehicle) => vehicle.margem_rs < 0);
    if (marginFilter === 'zero') items = items.filter((vehicle) => vehicle.margem_rs === 0);

    if (search) {
      const query = search.toLowerCase();
      items = items.filter((vehicle) =>
        (vehicle.title || '').toLowerCase().includes(query) ||
        (vehicle.marca || '').toLowerCase().includes(query),
      );
    }

    return items;
  }, [data, localEdits, brandFilter, marginFilter, search]);

  const totalVehicles = filtered.length;
  const totalMargin = filtered.reduce((sum, vehicle) => sum + vehicle.margem_rs, 0);
  const avgMarginPct = totalVehicles > 0 ? filtered.reduce((sum, vehicle) => sum + vehicle.margem_pct, 0) / totalVehicles : 0;
  const negativeCount = filtered.filter((vehicle) => vehicle.margem_rs < 0).length;
  const positiveCount = filtered.filter((vehicle) => vehicle.margem_rs > 0).length;
  const neutralCount = totalVehicles - positiveCount - negativeCount;

  const marginColor = (value: number) =>
    value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground';

  const bestVehicle = useMemo(() => {
    return filtered.length > 0 ? [...filtered].sort((a, b) => b.margem_rs - a.margem_rs)[0] : null;
  }, [filtered]);

  const riskVehicle = useMemo(() => {
    return filtered.length > 0 ? [...filtered].sort((a, b) => a.margem_rs - b.margem_rs)[0] : null;
  }, [filtered]);

  const chartData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => b.margem_rs - a.margem_rs)
      .slice(0, 10)
      .map((vehicle) => ({
        name: `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim(),
        margem: vehicle.margem_rs,
      }));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-[linear-gradient(145deg,rgba(13,20,37,0.98),rgba(7,11,23,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_left,rgba(16,185,129,0.10),transparent_24%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              Painel de Rentabilidade
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Margem</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Visualize a saúde da rentabilidade do estoque, identifique oportunidades e ajuste custos sem sair da mesa operacional.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Melhor margem</p>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">{bestVehicle?.title || bestVehicle?.modelo || 'Sem destaque'}</p>
                <p className="mt-1 text-sm font-medium text-emerald-400">{bestVehicle ? formatCurrency(bestVehicle.margem_rs) : '—'}</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Ponto de atenção</p>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">{riskVehicle?.title || riskVehicle?.modelo || 'Sem alerta'}</p>
                <p className="mt-1 text-sm font-medium text-red-400">{riskVehicle ? formatCurrency(riskVehicle.margem_rs) : '—'}</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Aproveitamento</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{positiveCount} veículos positivos</p>
                <p className="mt-1 text-sm font-medium text-blue-300">
                  {totalVehicles ? `${((positiveCount / totalVehicles) * 100).toFixed(0)}% do recorte` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:w-[430px]">
            <div className="rounded-[24px] border border-blue-500/10 bg-gradient-to-br from-blue-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Veículos analisados</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{totalVehicles}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/12 to-transparent p-5">
              <div className="flex flex-col gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Margem total</p>
                  <p className={`mt-2 break-all text-sm font-semibold leading-tight tabular-nums ${marginColor(totalMargin)}`}>{formatCurrency(totalMargin)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-violet-500/10 bg-gradient-to-br from-violet-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Margem média</p>
                  <p className={`mt-2 text-3xl font-semibold tabular-nums ${marginColor(avgMarginPct)}`}>{avgMarginPct.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-red-500/10 bg-gradient-to-br from-red-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/12 text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Margens negativas</p>
                  <p className="mt-2 text-3xl font-semibold text-red-400 tabular-nums">{negativeCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
        {chartData.length > 0 && (
          <div className="glass rounded-[28px] p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Top 10 rentabilidade</h3>
                <p className="mt-1 text-sm text-muted-foreground">Comparativo das melhores e piores margens do recorte atual.</p>
              </div>
              <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Atualizado em tempo real
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    width={132}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Margem']}
                    cursor={{ fill: 'rgba(59,130,246,0.06)' }}
                    contentStyle={{
                      borderRadius: 16,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'hsl(225,30%,12%)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
                      color: 'rgba(226,232,240,0.96)',
                    }}
                    labelStyle={{ color: 'rgba(226,232,240,0.88)', fontWeight: 600 }}
                    itemStyle={{ color: 'rgba(191,219,254,1)', fontWeight: 600 }}
                  />
                  <Bar dataKey="margem" radius={[0, 10, 10, 0]} maxBarSize={26}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.margem >= 0 ? 'hsl(160, 84%, 39%)' : 'hsl(0, 84%, 60%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="glass rounded-[28px] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-blue-300">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Leitura rápida</h3>
              <p className="text-sm text-muted-foreground">Filtros e síntese operacional da margem.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status do recorte</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {negativeCount > 0 ? 'Existem veículos exigindo correção de custo' : 'Carteira saudável no recorte atual'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {negativeCount} negativos, {positiveCount} positivos e {neutralCount} neutros.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar veículo..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 rounded-xl border-white/[0.06] bg-black/10 pl-10"
                />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-white/[0.06] bg-black/10">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as marcas</SelectItem>
                    {brands.map((brand) => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={marginFilter} onValueChange={setMarginFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-white/[0.06] bg-black/10">
                    <SelectValue placeholder="Margem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="positive">Positiva</SelectItem>
                    <SelectItem value="negative">Negativa</SelectItem>
                    <SelectItem value="zero">Zerada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-[28px] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.05] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Mapa de margem por veículo</h3>
            <p className="mt-1 text-sm text-muted-foreground">Edite custo, despesas e observações diretamente na mesa de análise.</p>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
            {filtered.length} veículos no recorte
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[220px]">Veículo</TableHead>
                <TableHead className="text-right">Preço Venda</TableHead>
                <TableHead className="text-right min-w-[130px]">Custo (R$)</TableHead>
                <TableHead className="text-right min-w-[130px]">Despesas (R$)</TableHead>
                <TableHead className="text-right">Margem (R$)</TableHead>
                <TableHead className="text-right">Margem (%)</TableHead>
                <TableHead className="min-w-[180px]">Observação</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nenhum veículo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((vehicle, idx) => (
                  <TableRow key={vehicle.vehicle_id} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{vehicle.title || vehicle.modelo || '—'}</p>
                        <p className="text-xs text-muted-foreground">{[vehicle.marca, vehicle.ano].filter(Boolean).join(' · ')}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {vehicle.preco ? formatCurrency(vehicle.preco) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="text"
                        className="ml-auto h-8 w-28 rounded-lg border-white/[0.06] bg-white/[0.03] text-right text-sm"
                        value={vehicle.custo_veiculo || ''}
                        onChange={(event) => handleChange(vehicle, 'custo_veiculo', event.target.value)}
                        disabled={!canEdit}
                        placeholder="0,00"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="text"
                        className="ml-auto h-8 w-28 rounded-lg border-white/[0.06] bg-white/[0.03] text-right text-sm"
                        value={vehicle.despesas || ''}
                        onChange={(event) => handleChange(vehicle, 'despesas', event.target.value)}
                        disabled={!canEdit}
                        placeholder="0,00"
                      />
                    </TableCell>
                    <TableCell className={`text-right font-bold tabular-nums ${marginColor(vehicle.margem_rs)}`}>
                      {formatCurrency(vehicle.margem_rs)}
                    </TableCell>
                    <TableCell className={`text-right font-bold tabular-nums ${marginColor(vehicle.margem_pct)}`}>
                      {vehicle.margem_pct.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Textarea
                        className="min-h-[32px] resize-none rounded-lg border-white/[0.06] bg-white/[0.03] text-xs"
                        rows={1}
                        value={vehicle.observacao || ''}
                        onChange={(event) => handleChange(vehicle, 'observacao', event.target.value)}
                        disabled={!canEdit}
                        placeholder="—"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
