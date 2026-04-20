import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowUpRight, Car, DollarSign, FileDown, Filter, Loader2, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { exportToCSV, formatCurrency, formatDate } from "@/lib/csvExport";
import { useToast } from "@/hooks/use-toast";
import type { LeadStatus } from "@/types/lead";
import { apiFetch, dataUrl } from "@/lib/api";

// Status labels para exibição
const STATUS_LABELS: Record<LeadStatus, string> = {
  novo_lead: "Novo Lead",
  negociando: "Negociando",
  vendido: "Vendido",
  perdido: "Perdido",
};

export default function Exportar() {
  const { toast } = useToast();

  // ==================== LEADS STATE ====================
  const [selectedLeadStatuses, setSelectedLeadStatuses] = useState<LeadStatus[]>([
    "novo_lead",
    "negociando",
    "vendido",
    "perdido",
  ]);

  // ==================== VEÍCULOS STATE ====================
  const [vehicleFilters, setVehicleFilters] = useState({
    status: "all",
    marca: "all",
    modelo: "all",
    ano: "all",
    precoMin: "",
    precoMax: "",
  });

  // ==================== FETCH LEADS DATA ====================
  const { data: exportData, isLoading } = useQuery({
    queryKey: ["export-data"],
    queryFn: () => apiFetch<any>(dataUrl("export-data")),
  });
  const leadsData = useMemo(
    () =>
      (exportData?.leads || []).map((lead: any) => ({
        ...lead,
        data_criacao: formatDate(lead.data_criacao),
        data_atualizacao: formatDate(lead.data_atualizacao),
        status: STATUS_LABELS[lead._rawStatus as LeadStatus],
      })),
    [exportData],
  );
  const vehiclesData = (exportData?.vehicles || []) as any[];
  const margensData = (exportData?.margens || []) as any[];
  const vendasData = (exportData?.vendas || []) as any[];
  const leadsLoading = isLoading;
  const vehiclesLoading = isLoading;
  const margensLoading = isLoading;
  const vendasLoading = isLoading;

  // ==================== DERIVED DATA ====================
  
  // Leads filtrados por status selecionados
  const filteredLeads = useMemo(() => {
    if (!leadsData) return [];
    return leadsData.filter((lead) => selectedLeadStatuses.includes(lead._rawStatus));
  }, [leadsData, selectedLeadStatuses]);

  // Opções únicas para filtros de veículos
  const vehicleOptions = useMemo(() => {
    if (!vehiclesData) return { marcas: [], modelos: [], anos: [] };
    return {
      marcas: [...new Set(vehiclesData.map((v) => v.marca).filter(Boolean))].sort(),
      modelos: [...new Set(vehiclesData.map((v) => v.modelo).filter(Boolean))].sort(),
      anos: [...new Set(vehiclesData.map((v) => v.ano).filter(Boolean))].sort((a, b) => Number(b || 0) - Number(a || 0)),
    };
  }, [vehiclesData]);

  // Veículos filtrados
  const filteredVehicles = useMemo(() => {
    if (!vehiclesData) return [];
    return vehiclesData.filter((v) => {
      if (vehicleFilters.status !== "all" && v.status !== vehicleFilters.status) return false;
      if (vehicleFilters.marca !== "all" && v.marca !== vehicleFilters.marca) return false;
      if (vehicleFilters.modelo !== "all" && v.modelo !== vehicleFilters.modelo) return false;
      if (vehicleFilters.ano !== "all" && String(v.ano) !== vehicleFilters.ano) return false;
      if (vehicleFilters.precoMin && (v.preco || 0) < Number(vehicleFilters.precoMin)) return false;
      if (vehicleFilters.precoMax && (v.preco || 0) > Number(vehicleFilters.precoMax)) return false;
      return true;
    });
  }, [vehiclesData, vehicleFilters]);

  // ==================== EXPORT HANDLERS ====================

  const handleExportLeads = () => {
    if (filteredLeads.length === 0) {
      toast({ title: "Nenhum lead para exportar", variant: "destructive" });
      return;
    }

    const dataToExport = filteredLeads.map(({ _rawStatus, ...rest }) => rest);
    
    exportToCSV(dataToExport, [
      { key: "nome", header: "Nome do Lead" },
      { key: "telefone", header: "Telefone / WhatsApp" },
      { key: "data_criacao", header: "Data de Criação" },
      { key: "status", header: "Status do Lead" },
      { key: "responsavel", header: "Responsável" },
      { key: "veiculo_interesse", header: "Veículo de Interesse" },
      { key: "observacao", header: "Observação" },
      { key: "origem", header: "Origem" },
      { key: "data_atualizacao", header: "Data da Última Atualização" },
    ], "leads_pipeline");

    toast({ title: "CSV exportado com sucesso!" });
  };

  const handleExportVehicles = (useFilters: boolean) => {
    const dataToExport = useFilters ? filteredVehicles : (vehiclesData || []);
    
    if (dataToExport.length === 0) {
      toast({ title: "Nenhum veículo para exportar", variant: "destructive" });
      return;
    }

    const formattedData = dataToExport.map((v) => ({
      vehicle_id: v.vehicle_id,
      title: v.title || "",
      marca: v.marca || "",
      modelo: v.modelo || "",
      ano: v.ano ? String(v.ano) : "",
      preco: formatCurrency(v.preco),
      km: v.km ? String(v.km) : "",
      combustivel: v.combustivel || "",
      cambio: v.cambio || "",
      cor: v.cor || "",
      status: v.status || "",
    }));

    exportToCSV(formattedData, [
      { key: "vehicle_id", header: "ID do Veículo" },
      { key: "title", header: "Nome do Veículo" },
      { key: "marca", header: "Marca" },
      { key: "modelo", header: "Modelo" },
      { key: "ano", header: "Ano" },
      { key: "preco", header: "Preço" },
      { key: "km", header: "KM" },
      { key: "combustivel", header: "Combustível" },
      { key: "cambio", header: "Câmbio" },
      { key: "cor", header: "Cor" },
      { key: "status", header: "Status" },
    ], "veiculos_estoque");

    toast({ title: "CSV exportado com sucesso!" });
  };

  const handleExportVendas = () => {
    if (!vendasData || vendasData.length === 0) {
      toast({ title: "Nenhuma venda para exportar", variant: "destructive" });
      return;
    }

    const formattedData = vendasData.map((v) => ({
      nome_do_veiculo: (v.estoque_carros as { title?: string; preco?: number } | null)?.title || "",
      preco_de_tabela: formatCurrency((v.estoque_carros as { title?: string; preco?: number } | null)?.preco),
      preco_de_venda: formatCurrency(v.preco_venda),
      comprador: v.comprador_nome || "",
      numero_de_telefone: v.comprador_telefone || "",
      forma_de_pagamento: v.forma_pagamento === "avista" ? "À Vista" : v.forma_pagamento === "financiado" ? "Financiado" : "",
      data_de_venda: formatDate(v.data_venda),
      valor_da_entrada: formatCurrency(v.valor_entrada),
      valor_financiado: formatCurrency(v.valor_financiamento),
    }));

    exportToCSV(formattedData, [
      { key: "nome_do_veiculo", header: "Nome do Veículo" },
      { key: "preco_de_tabela", header: "Preço de Tabela" },
      { key: "preco_de_venda", header: "Preço de Venda" },
      { key: "comprador", header: "Comprador" },
      { key: "numero_de_telefone", header: "Número de Telefone" },
      { key: "forma_de_pagamento", header: "Forma de Pagamento" },
      { key: "data_de_venda", header: "Data de Venda" },
      { key: "valor_da_entrada", header: "Valor da Entrada" },
      { key: "valor_financiado", header: "Valor Financiado" },
    ], "vendas");

    toast({ title: "CSV exportado com sucesso!" });
  };

  const handleExportMargens = () => {
    if (!margensData || margensData.length === 0) {
      toast({ title: "Nenhum veículo para exportar", variant: "destructive" });
      return;
    }

    const formattedData = margensData.map((v) => ({
      veiculo: v.title || "",
      marca: v.marca || "",
      modelo: v.modelo || "",
      ano: v.ano ? String(v.ano) : "",
      preco_venda: formatCurrency(v.preco),
      custo: formatCurrency(v.custo),
      despesas: formatCurrency(v.despesas),
      margem_reais: formatCurrency(v.margem_rs),
      margem_percentual: v.margem_pct.toFixed(1) + "%",
      observacao_margem: v.observacao_margem,
      status_estoque: v.status || "",
      created_at: formatDate(v.created_at),
    }));

    exportToCSV(formattedData, [
      { key: "veiculo", header: "Veículo" },
      { key: "marca", header: "Marca" },
      { key: "modelo", header: "Modelo" },
      { key: "ano", header: "Ano" },
      { key: "preco_venda", header: "Preço de Venda" },
      { key: "custo", header: "Custo" },
      { key: "despesas", header: "Despesas" },
      { key: "margem_reais", header: "Margem (R$)" },
      { key: "margem_percentual", header: "Margem (%)" },
      { key: "observacao_margem", header: "Observação" },
      { key: "status_estoque", header: "Status Estoque" },
      { key: "created_at", header: "Data de Criação" },
    ], "margens_estoque");

    toast({ title: "CSV exportado com sucesso!" });
  };

  // ==================== TOGGLE STATUS HANDLER ====================
  const toggleLeadStatus = (status: LeadStatus) => {
    setSelectedLeadStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const exportStats = [
    {
      title: "Leads prontos",
      value: leadsLoading ? "..." : String(filteredLeads.length),
      sub: "pipeline filtrado para CSV",
      icon: Users,
      iconTone: "text-sky-300",
      glow: "from-sky-500/20 via-sky-500/5 to-transparent",
    },
    {
      title: "Estoque filtrado",
      value: vehiclesLoading ? "..." : String(filteredVehicles.length),
      sub: `${vehiclesData?.length || 0} veículos totais`,
      icon: Car,
      iconTone: "text-emerald-300",
      glow: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    },
    {
      title: "Margens disponíveis",
      value: margensLoading ? "..." : String(margensData?.length || 0),
      sub: "análises de rentabilidade",
      icon: TrendingUp,
      iconTone: "text-violet-300",
      glow: "from-violet-500/20 via-violet-500/5 to-transparent",
    },
    {
      title: "Vendas exportáveis",
      value: vendasLoading ? "..." : String(vendasData?.length || 0),
      sub: "histórico comercial pronto",
      icon: DollarSign,
      iconTone: "text-cyan-300",
      glow: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/[0.06] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.34)] glass md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.16),transparent_28%)]" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100/80">
              <Sparkles className="h-3.5 w-3.5" />
              Central de exportação
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Exports com padrão executivo</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Gere CSVs de leads, estoque, margens e vendas com filtros práticos, contexto claro e um fluxo mais consistente com o restante do CRM.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[460px]">
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Módulos exportáveis</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">4</p>
            </div>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Cobertura</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">Leads, estoque, margem e vendas</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {exportStats.map((stat) => (
          <div
            key={stat.title}
            className="relative overflow-hidden rounded-[24px] border border-white/[0.06] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.26)]"
            style={{ background: "linear-gradient(180deg, rgba(17,23,39,0.97), rgba(10,14,26,0.97))" }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.glow} opacity-70`} />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04]">
                <stat.icon className={`h-5 w-5 ${stat.iconTone}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <Users className="h-5 w-5 text-sky-300" />
                Leads do pipeline
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Selecione os estágios que entram no arquivo e exporte apenas o que faz sentido para a operação.</p>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
              CSV pronto para Excel
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((status) => (
              <label key={status} htmlFor={`status-${status}`} className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.05]">
                <Checkbox
                  id={`status-${status}`}
                  checked={selectedLeadStatuses.includes(status)}
                  onCheckedChange={() => toggleLeadStatus(status)}
                />
                <span className="text-sm text-foreground">{STATUS_LABELS[status]}</span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.05] pt-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              {leadsLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando leads...
                </span>
              ) : (
                <span>{filteredLeads.length} leads serão exportados com os filtros atuais.</span>
              )}
            </p>
            <Button
              onClick={handleExportLeads}
              disabled={leadsLoading || filteredLeads.length === 0}
              className="rounded-xl border-0 bg-gradient-to-r from-primary to-blue-400 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Baixar CSV de Leads
            </Button>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                Boas práticas do export
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Use filtros objetivos para reduzir retrabalho e gerar arquivos mais úteis para análises externas.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-foreground">Leads</p>
              <p className="mt-1 text-sm text-muted-foreground">Exporte por estágio quando precisar repassar base comercial, auditoria ou follow-up.</p>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-foreground">Veículos</p>
              <p className="mt-1 text-sm text-muted-foreground">Filtre marca, modelo, ano e faixa de preço antes de compartilhar o estoque.</p>
            </div>
            <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-foreground">Margens e vendas</p>
              <p className="mt-1 text-sm text-muted-foreground">Arquivos completos são ideais para fechamento financeiro e análises gerenciais.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Car className="h-5 w-5 text-emerald-300" />
              Estoque com filtros avançados
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Monte um recorte preciso do estoque antes de gerar o CSV.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtros aplicáveis
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={vehicleFilters.status}
              onValueChange={(value) => setVehicleFilters((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="border-white/[0.08] bg-white/[0.03]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="negociando">Negociando</SelectItem>
                <SelectItem value="vendido">Vendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Marca</Label>
            <Select
              value={vehicleFilters.marca}
              onValueChange={(value) => setVehicleFilters((prev) => ({ ...prev, marca: value }))}
            >
              <SelectTrigger className="border-white/[0.08] bg-white/[0.03]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {vehicleOptions.marcas.map((marca) => (
                  <SelectItem key={marca} value={marca!}>
                    {marca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select
              value={vehicleFilters.modelo}
              onValueChange={(value) => setVehicleFilters((prev) => ({ ...prev, modelo: value }))}
            >
              <SelectTrigger className="border-white/[0.08] bg-white/[0.03]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {vehicleOptions.modelos.map((modelo) => (
                  <SelectItem key={modelo} value={modelo!}>
                    {modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ano</Label>
            <Select
              value={vehicleFilters.ano}
              onValueChange={(value) => setVehicleFilters((prev) => ({ ...prev, ano: value }))}
            >
              <SelectTrigger className="border-white/[0.08] bg-white/[0.03]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {vehicleOptions.anos.map((ano) => (
                  <SelectItem key={ano} value={String(ano)}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preço mín.</Label>
            <Input
              type="number"
              placeholder="R$ 0"
              value={vehicleFilters.precoMin}
              onChange={(event) => setVehicleFilters((prev) => ({ ...prev, precoMin: event.target.value }))}
              className="border-white/[0.08] bg-white/[0.03]"
            />
          </div>

          <div className="space-y-2">
            <Label>Preço máx.</Label>
            <Input
              type="number"
              placeholder="R$ 999.999"
              value={vehicleFilters.precoMax}
              onChange={(event) => setVehicleFilters((prev) => ({ ...prev, precoMax: event.target.value }))}
              className="border-white/[0.08] bg-white/[0.03]"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.05] pt-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-muted-foreground">
            {vehiclesLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando estoque...
              </span>
            ) : (
              <span>{filteredVehicles.length} veículos filtrados de um total de {vehiclesData?.length || 0} registros.</span>
            )}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => handleExportVehicles(false)}
              disabled={vehiclesLoading}
              className="rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar tudo
            </Button>
            <Button
              onClick={() => handleExportVehicles(true)}
              disabled={vehiclesLoading || filteredVehicles.length === 0}
              className="rounded-xl border-0 bg-gradient-to-r from-primary to-blue-400 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar filtrado
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <TrendingUp className="h-5 w-5 text-violet-300" />
                Margens do estoque
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Baixe a leitura completa de custos, despesas e margem por veículo.</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-sm text-muted-foreground">
              {margensLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando margens...
                </span>
              ) : (
                <span>{margensData?.length || 0} veículos com análise de margem disponível.</span>
              )}
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleExportMargens}
              disabled={margensLoading || !margensData?.length}
              className="rounded-xl border-0 bg-gradient-to-r from-primary to-blue-400 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Baixar CSV de Margens
            </Button>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.06] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.26)] glass">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <DollarSign className="h-5 w-5 text-cyan-300" />
                Histórico de vendas
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Exporte compradores, valores e forma de pagamento em um único arquivo.</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-sm text-muted-foreground">
              {vendasLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando vendas...
                </span>
              ) : (
                <span>{vendasData?.length || 0} vendas prontas para exportação.</span>
              )}
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleExportVendas}
              disabled={vendasLoading || !vendasData?.length}
              className="rounded-xl border-0 bg-gradient-to-r from-primary to-blue-400 transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Baixar CSV de Vendas
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
