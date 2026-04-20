import { useMemo } from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SaleData {
  preco_venda: number | null;
  data_venda: string | null;
}

interface SalesChartsProps {
  salesData: Record<string, SaleData>;
}

interface MonthlyData {
  month: string;
  monthKey: string;
  quantidade: number;
  valor: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ 
  active, 
  payload, 
  label,
  valueType 
}: { 
  active?: boolean; 
  payload?: Array<{ value: number }>; 
  label?: string;
  valueType: "quantidade" | "valor";
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-white/[0.06] rounded-xl px-3 py-2 shadow-lg shadow-black/30">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">
        {valueType === "valor" 
          ? formatCurrency(payload[0].value) 
          : `${payload[0].value} venda${payload[0].value !== 1 ? "s" : ""}`
        }
      </p>
    </div>
  );
};

export const SalesCharts = ({ salesData }: SalesChartsProps) => {
  const monthlyData = useMemo(() => {
    if (!salesData) return [];

    const salesArray = Object.values(salesData);
    const grouped: Record<string, { quantidade: number; valor: number }> = {};

    salesArray.forEach((sale) => {
      if (!sale.data_venda) return;
      
      try {
        const date = parseISO(sale.data_venda);
        const monthKey = format(date, "yyyy-MM");
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = { quantidade: 0, valor: 0 };
        }
        
        grouped[monthKey].quantidade += 1;
        grouped[monthKey].valor += sale.preco_venda || 0;
      } catch {
        // Skip invalid dates
      }
    });

    // Convert to array and sort
    const result: MonthlyData[] = Object.entries(grouped)
      .map(([monthKey, data]) => ({
        monthKey,
        month: format(parseISO(`${monthKey}-01`), "MMM/yy", { locale: ptBR }),
        quantidade: data.quantidade,
        valor: data.valor,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .slice(-12); // Last 12 months

    return result;
  }, [salesData]);

  if (monthlyData.length === 0) {
    return null;
  }

  const peakMonth = monthlyData.reduce((best, current) => (current.valor > best.valor ? current : best), monthlyData[0]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(17,23,39,0.97),rgba(10,14,26,0.97))] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Cadência de vendas</h3>
            <p className="mt-1 text-sm text-muted-foreground">Volume mensal de negócios concluídos nos últimos 12 meses.</p>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
            {monthlyData.length} meses ativos
          </div>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip 
                content={<CustomTooltip valueType="quantidade" />}
                cursor={{ fill: "rgba(59,130,246,0.06)" }}
              />
              <Bar dataKey="quantidade" radius={[10, 10, 0, 0]} maxBarSize={38}>
                {monthlyData.map((entry) => (
                  <Cell key={entry.monthKey} fill={entry.monthKey === peakMonth.monthKey ? "#38bdf8" : "rgba(96,165,250,0.72)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(17,23,39,0.97),rgba(10,14,26,0.97))] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Receita por mês</h3>
            <p className="mt-1 text-sm text-muted-foreground">Comparativo do valor vendido ao longo do período recente.</p>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-emerald-300">
            Pico em {peakMonth.month}
          </div>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip 
                content={<CustomTooltip valueType="valor" />}
                cursor={{ stroke: "rgba(34,197,94,0.35)", strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="valor" 
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#colorValor)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
