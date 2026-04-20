import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Fuel, Gauge, Loader2, Search, Car, Clock, Sparkles, ArrowUpRight, Wallet, CarFront, SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays } from "date-fns";
import { apiFetch, dataUrl } from "@/lib/api";

const Vehicles = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    marca: "",
    modelo: "",
    ano: "",
    precoMin: "",
    precoMax: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles-ativos"],
    queryFn: () => apiFetch<any[]>(dataUrl("vehicles-active")),
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "negociando":
        return <Badge className="bg-warning/15 text-warning border-warning/20 text-[11px] font-medium">Em Negociação</Badge>;
      case "vendido":
        return <Badge className="bg-muted text-muted-foreground border-border text-[11px] font-medium">Vendido</Badge>;
      default:
        return <Badge className="bg-success/15 text-success border-success/20 text-[11px] font-medium">Disponível</Badge>;
    }
  };

  const uniqueMarcas = Array.from(new Set(vehicles?.map((v) => v.marca).filter(Boolean) || [])) as string[];
  const uniqueModelos = Array.from(new Set(vehicles?.map((v) => v.modelo).filter(Boolean) || [])) as string[];
  const uniqueAnos = Array.from(new Set(vehicles?.map((v) => v.ano).filter((a) => a !== null) || []))
    .sort((a, b) => ((b as number) || 0) - ((a as number) || 0)) as number[];

  const filteredVehicles = useMemo(() => {
    return vehicles?.filter((vehicle) => {
      if (debouncedSearch.trim()) {
        const searchLower = debouncedSearch.toLowerCase().trim();
        const match = [vehicle.marca, vehicle.modelo, vehicle.title].some((field) => field?.toLowerCase().includes(searchLower));
        if (!match) return false;
      }
      if (filters.marca && vehicle.marca !== filters.marca) return false;
      if (filters.modelo && vehicle.modelo !== filters.modelo) return false;
      if (filters.ano && vehicle.ano !== Number(filters.ano)) return false;
      if (filters.precoMin && (vehicle.preco || 0) < Number(filters.precoMin)) return false;
      if (filters.precoMax && (vehicle.preco || 0) > Number(filters.precoMax)) return false;
      return true;
    }) || [];
  }, [vehicles, debouncedSearch, filters]);

  const formatCurrency = (value: number | null) => {
    if (!value) return "Consulte";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatKm = (value: number | null) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("pt-BR").format(value) + " km";
  };

  const totalVehicles = filteredVehicles.length;
  const negotiatingCount = filteredVehicles.filter((vehicle) => vehicle.status === "negociando").length;
  const recentArrivals = filteredVehicles.filter((vehicle) => {
    if (!vehicle.created_at) return false;
    return differenceInDays(new Date(), new Date(vehicle.created_at)) <= 7;
  }).length;
  const averagePrice = totalVehicles
    ? filteredVehicles.reduce((sum, vehicle) => sum + (vehicle.preco || 0), 0) / totalVehicles
    : 0;

  const resetFilters = () => {
    setFilters({ marca: "", modelo: "", ano: "", precoMin: "", precoMax: "" });
    setSearchTerm("");
    setDebouncedSearch("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-white/[0.06] bg-[linear-gradient(145deg,rgba(10,18,34,0.98),rgba(7,11,23,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_left,rgba(16,185,129,0.10),transparent_28%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              Inventário Ativo
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Veículos</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Organize o estoque com uma leitura mais premium do inventário, destacando preço, giro e negociação sem perder velocidade na consulta.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Disponíveis</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{totalVehicles} veículos</p>
                <p className="mt-1 text-sm text-blue-300">Recorte atual do inventário</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Preço médio</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{formatCurrency(averagePrice)}</p>
                <p className="mt-1 text-sm text-emerald-300">Faixa média do estoque filtrado</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Chegadas recentes</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{recentArrivals} entradas</p>
                <p className="mt-1 text-sm text-violet-300">Últimos 7 dias</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:w-[430px]">
            <div className="rounded-[24px] border border-blue-500/10 bg-gradient-to-br from-blue-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
                  <CarFront className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total em tela</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{totalVehicles}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-amber-500/10 bg-gradient-to-br from-amber-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Negociando</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{negotiatingCount}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/12 to-transparent p-5 sm:col-span-2">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Leitura financeira</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{totalVehicles ? `${Math.round((negotiatingCount / totalVehicles) * 100)}% do recorte em negociação ou giro imediato` : "Sem movimentação"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Filtros ativos afetam tanto o volume quanto os indicadores do topo.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(15,21,37,0.96),rgba(10,14,26,0.96))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-blue-300">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Busca e filtros</h2>
              <p className="text-sm text-muted-foreground">Refine o inventário por marca, modelo, ano e faixa de preço.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar veículo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-2xl border-white/[0.08] bg-white/[0.03] pl-10"
              />
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label className="text-xs text-muted-foreground">Marca</Label>
            <Select value={filters.marca} onValueChange={(v) => setFilters({ ...filters, marca: v === "all" ? "" : v })}>
              <SelectTrigger className="mt-1 h-11 rounded-2xl border-white/[0.08] bg-white/[0.03]"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {uniqueMarcas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Modelo</Label>
            <Select value={filters.modelo} onValueChange={(v) => setFilters({ ...filters, modelo: v === "all" ? "" : v })}>
              <SelectTrigger className="mt-1 h-11 rounded-2xl border-white/[0.08] bg-white/[0.03]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueModelos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ano</Label>
            <Select value={filters.ano} onValueChange={(v) => setFilters({ ...filters, ano: v === "all" ? "" : v })}>
              <SelectTrigger className="mt-1 h-11 rounded-2xl border-white/[0.08] bg-white/[0.03]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueAnos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Preço Mín</Label>
            <Input type="number" placeholder="R$ 0" value={filters.precoMin} onChange={(e) => setFilters({ ...filters, precoMin: e.target.value })} className="mt-1 h-11 rounded-2xl border-white/[0.08] bg-white/[0.03]" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Preço Máx</Label>
            <Input type="number" placeholder="R$ 999.999" value={filters.precoMax} onChange={(e) => setFilters({ ...filters, precoMax: e.target.value })} className="mt-1 h-11 rounded-2xl border-white/[0.08] bg-white/[0.03]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredVehicles.map((vehicle) => {
          const daysInStock = vehicle.created_at ? differenceInDays(new Date(), new Date(vehicle.created_at)) : 0;

          return (
            <div
              key={vehicle.vehicle_id}
              className="group cursor-pointer overflow-hidden rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(17,23,39,0.97),rgba(10,14,26,0.97))] shadow-[0_18px_44px_rgba(0,0,0,0.26)] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.1] hover:shadow-[0_24px_60px_rgba(0,0,0,0.34)]"
              onClick={() => navigate(`/veiculos/${vehicle.vehicle_id}`)}
            >
              <div className="relative flex h-44 items-center justify-center border-b border-white/[0.05] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <div className="absolute left-4 top-4">{getStatusBadge(vehicle.status)}</div>
                <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-blue-200/80 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <Car className="h-14 w-14 text-white/15" />
              </div>

              <div className="space-y-4 p-5">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{vehicle.marca || "Marca"}</p>
                  <h3 className="mt-2 line-clamp-1 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                    {vehicle.title || "Sem título"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{[vehicle.modelo, vehicle.ano].filter(Boolean).join(" • ")}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Preço</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-300 tabular-nums">
                      {formatCurrency(vehicle.preco)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Giro</p>
                    <p className="mt-2 text-xl font-semibold text-foreground tabular-nums">{daysInStock}d</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5" />
                      Quilometragem
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatKm(vehicle.km)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Fuel className="h-3.5 w-3.5" />
                      Combustível
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{vehicle.combustivel || "Não informado"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Estoque
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{daysInStock <= 7 ? "Entrada recente" : `${daysInStock} dias`}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.015] px-4 py-3 text-sm text-muted-foreground">
                  <span>Ver detalhes do veículo</span>
                  <ArrowUpRight className="h-4 w-4 text-blue-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(15,21,37,0.96),rgba(10,14,26,0.96))] py-14 text-center text-sm text-muted-foreground">
          Nenhum veículo encontrado com os filtros selecionados.
        </div>
      )}
    </div>
  );
};

export default Vehicles;
