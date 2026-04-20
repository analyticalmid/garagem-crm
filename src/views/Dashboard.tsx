import { DollarSign, TrendingUp, Users, Car, Loader2, AlertTriangle, Clock, Sparkles, ArrowUpRight, BadgeDollarSign, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo } from "react";
import { formatBrazilianPhone } from "@/lib/utils";
import { Link } from "react-router-dom";
import { apiFetch, dataUrl } from "@/lib/api";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const Dashboard = () => {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard"],
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => apiFetch<any>(dataUrl("dashboard")),
  });
  const leadsData = dashboardData?.leadsData;
  const vehiclesData = dashboardData?.vehiclesData;
  const salesData = dashboardData?.salesData;
  const marginsData = dashboardData?.marginsData;
  const profiles = dashboardData?.profiles || [];

  // Funnel data
  const funnelData = useMemo(() => {
    if (!leadsData) return [];
    return [
      { name: "Novos", value: leadsData.novosLeads },
      { name: "Negociando", value: leadsData.negociando },
      { name: "Vendidos", value: leadsData.vendidos },
      { name: "Perdidos", value: leadsData.perdidos },
    ];
  }, [leadsData]);

  // Seller performance
  const sellerData = useMemo(() => {
    if (!salesData?.sellerMap || !profiles) return [];
    return Object.entries(salesData.sellerMap as Record<string, { count: number; revenue: number }>)
      .map(([id, data]) => ({
        name: profiles.find(p => p.id === id)?.full_name || "Desconhecido",
        vendas: data.count,
        receita: data.revenue,
      }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 5);
  }, [salesData, profiles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    {
      title: "Receita do mês",
      value: formatCurrency(salesData?.receitaMes || 0),
      icon: DollarSign,
      gradient: "from-blue-500/20 to-blue-600/5",
      iconColor: "text-blue-400",
      borderGlow: "hover:border-blue-500/30",
      sub: `${salesData?.vendasMes || 0} vendas`,
    },
    {
      title: "Margem do mês",
      value: formatCurrency(marginsData?.margemMes || 0),
      icon: TrendingUp,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      iconColor: "text-emerald-400",
      borderGlow: "hover:border-emerald-500/30",
      sub: (marginsData?.margemMes || 0) >= 0 ? "Positiva" : "Negativa",
    },
    {
      title: "Novos leads",
      value: leadsData?.novosLeads || 0,
      icon: Users,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-400",
      borderGlow: "hover:border-violet-500/30",
      sub: `${leadsData?.total || 0} total`,
    },
    {
      title: "Veículos disponíveis",
      value: vehiclesData?.disponivel || 0,
      icon: Car,
      gradient: "from-cyan-500/20 to-cyan-600/5",
      iconColor: "text-cyan-400",
      borderGlow: "hover:border-cyan-500/30",
      sub: `${vehiclesData?.total || 0} no estoque`,
    },
  ];

  const monthlyConversion = leadsData?.total ? ((leadsData.vendidos / leadsData.total) * 100) : 0;
  const totalAttentionItems = (leadsData?.stalledLeads.length || 0) + (vehiclesData?.stalledVehicles || 0);
  const topSeller = sellerData[0];
  const marginTone = (marginsData?.margemMes || 0) >= 0 ? "text-emerald-300" : "text-red-300";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-white/[0.06] bg-[linear-gradient(145deg,rgba(10,18,34,0.98),rgba(7,11,23,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_left,rgba(16,185,129,0.10),transparent_28%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              Business Overview
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Acompanhe receita, margem, leads e estoque em uma leitura executiva única, com foco no que está acelerando o negócio e no que precisa de ação imediata.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Conversão</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{monthlyConversion.toFixed(1)}%</p>
                <p className="mt-1 text-sm text-blue-300">Leads vendidos sobre base total</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Melhor vendedor</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{topSeller?.name || "Sem ranking"}</p>
                <p className="mt-1 text-sm text-emerald-300">{topSeller ? `${topSeller.vendas} vendas no topo` : "Aguardando vendas"}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Itens de atenção</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{totalAttentionItems} alertas</p>
                <p className="mt-1 text-sm text-amber-300">Leads e estoque com baixa tração</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:w-[430px]">
            <div className="rounded-[24px] border border-blue-500/10 bg-gradient-to-br from-blue-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
                  <BadgeDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Receita do mês</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{formatCurrency(salesData?.receitaMes || 0)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Margem do mês</p>
                  <p className={`mt-2 text-2xl font-semibold tabular-nums ${marginTone}`}>{formatCurrency(marginsData?.margemMes || 0)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-violet-500/10 bg-gradient-to-br from-violet-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Leads ativos</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{leadsData?.total || 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-cyan-500/10 bg-gradient-to-br from-cyan-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-300">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Vendas no mês</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{salesData?.vendasMes || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className={`relative overflow-hidden rounded-[24px] border border-white/[0.06] p-5 card-hover ${kpi.borderGlow} transition-all duration-300`}
            style={{
              background: 'linear-gradient(180deg, rgba(17,23,39,0.97), rgba(10,14,26,0.97))',
              boxShadow: '0 18px 44px rgba(0,0,0,0.26)',
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-60`} />
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Pipeline de Leads</h3>
              <p className="mt-1 text-sm text-muted-foreground">Evolução do funil comercial entre novos, negociação, vendidos e perdidos.</p>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
              {leadsData?.total || 0} leads monitorados
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  width={84}
                />
                <Tooltip
                  formatter={(value: number) => [value, "leads"]}
                  cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                  labelStyle={{ color: "rgba(226, 232, 240, 0.95)", fontWeight: 600 }}
                  itemStyle={{ color: "rgba(191, 219, 254, 0.98)", fontWeight: 600 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(59, 130, 246, 0.18)",
                    background: "hsl(225, 30%, 10%)",
                    color: "rgba(226, 232, 240, 0.96)",
                    boxShadow: "0 18px 40px rgba(2, 8, 23, 0.45)",
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={30}
                  fill="hsl(217, 91%, 60%)"
                  animationDuration={280}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Performance por vendedor</h3>
              <p className="mt-1 text-sm text-muted-foreground">Ranking consolidado das vendas registradas por responsável.</p>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
              Top 5
            </div>
          </div>
          {sellerData.length > 0 ? (
            <div className="space-y-3">
              {sellerData.map((seller, idx) => (
                <div key={seller.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-foreground">{seller.name}</p>
                        <p className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{seller.vendas} vendas</p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${sellerData[0]?.vendas ? (seller.vendas / sellerData[0].vendas) * 100 : 0}%`,
                            background: "linear-gradient(90deg, hsl(217, 91%, 60%), hsl(190, 90%, 50%))",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(seller.receita)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma venda registrada no período.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-3.5 w-3.5 text-warning" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Leads parados</h3>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
              &gt; 7 dias
            </div>
          </div>
          {leadsData?.stalledLeads && leadsData.stalledLeads.length > 0 ? (
            <div className="space-y-3">
              {leadsData.stalledLeads.map((lead, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground">{formatBrazilianPhone(lead.telefone)}</p>
                  </div>
                  <span className="whitespace-nowrap rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    {lead.dias}d
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lead parado</p>
          )}
        </div>

        <div className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Estoque parado</h3>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
              &gt; 30 dias
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <p className="text-sm text-muted-foreground">Total parado</p>
              <p className="text-lg font-bold tabular-nums text-foreground">{vehiclesData?.stalledVehicles || 0}</p>
            </div>
            {vehiclesData?.stalledVehiclesList && vehiclesData.stalledVehiclesList.length > 0 ? (
              <>
                {vehiclesData.stalledVehiclesList.map((vehicle, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <p className="min-w-0 truncate text-sm text-foreground">{vehicle.title}</p>
                    <span className="whitespace-nowrap rounded-full border border-red-400/20 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                      {vehicle.dias}d
                    </span>
                  </div>
                ))}
                <Link to="/veiculos" className="inline-flex items-center gap-1 px-1 pt-2 text-xs font-medium text-primary transition-colors hover:text-primary/80">
                  Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum veículo parado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
