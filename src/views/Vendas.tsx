import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, DollarSign, CreditCard, Banknote, Plus, Sparkles, ArrowUpRight, CarFront, CalendarDays, Wallet, BadgeDollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { SalesCharts } from "@/components/SalesCharts";
import type { Database } from "@/integrations/supabase/types";
import { apiFetch, dataUrl } from "@/lib/api";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type FormaPagamento = "avista" | "financiado";

const statusConfig = {
  disponivel: { label: "Disponível", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  negociando: { label: "Negociando", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  vendido: { label: "Vendido", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

interface SaleFormData {
  compradorNome: string;
  compradorTelefone: string;
  precoVenda: number | null;
  formaPagamento: FormaPagamento | null;
  valorEntrada: number | null;
  valorFinanciamento: number | null;
  dataVenda: string;
}

const emptyManualSale = {
  nome_veiculo: "",
  marca_veiculo: "",
  modelo_veiculo: "",
  ano_veiculo: "" as string,
  km_veiculo: "" as string,
  preco_venda: "" as string,
  data_venda: "",
  forma_pagamento: "" as string,
  valor_entrada: "" as string,
  valor_financiamento: "" as string,
  comprador_nome: "",
  comprador_telefone: "",
  observacao: "",
};

const inputClassName = "h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary/40";

const Vendas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<SaleFormData>>>({});
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState(emptyManualSale);

  // Fetch sold vehicles with their sale data
  const { data: salesPageData, isLoading } = useQuery({
    queryKey: ["sales-page"],
    staleTime: 45 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => apiFetch<any>(dataUrl("sales-page")),
  });
  const soldVehicles = salesPageData?.soldVehicles || [];
  const manualSales = salesPageData?.manualSales || [];
  const salesData = useMemo(() => {
    const salesMap: Record<string, any> = {};
    (salesPageData?.sales || []).forEach((sale: any) => {
      if (sale.vehicle_id) salesMap[sale.vehicle_id] = sale;
    });
    return salesMap;
  }, [salesPageData]);

  // Save sale mutation
  const saveSaleMutation = useMutation({
    mutationFn: async ({ vehicleId, data }: { vehicleId: string; data: SaleFormData }) => {
      await apiFetch(dataUrl("sale"), { method: "PATCH", body: { vehicleId, data } });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sales-page"] });
      setLocalEdits((prev) => {
        const updated = { ...prev };
        delete updated[variables.vehicleId];
        return updated;
      });
      toast({
        title: "Dados salvos",
        description: "Informações da venda atualizadas com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar dados da venda",
        variant: "destructive",
      });
    },
  });

  // Create manual sale mutation
  const createManualSaleMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(dataUrl("manual-sale"), { method: "POST", body: {
        vehicle_id: null,
        nome_veiculo: manualForm.nome_veiculo || null,
        marca_veiculo: manualForm.marca_veiculo || null,
        modelo_veiculo: manualForm.modelo_veiculo || null,
        ano_veiculo: manualForm.ano_veiculo ? Number(manualForm.ano_veiculo) : null,
        km_veiculo: manualForm.km_veiculo ? Number(manualForm.km_veiculo) : null,
        preco_venda: manualForm.preco_venda ? Number(manualForm.preco_venda) : null,
        data_venda: manualForm.data_venda || null,
        forma_pagamento: (manualForm.forma_pagamento as FormaPagamento) || null,
        valor_entrada: manualForm.valor_entrada ? Number(manualForm.valor_entrada) : null,
        valor_financiamento: manualForm.valor_financiamento ? Number(manualForm.valor_financiamento) : null,
        comprador_nome: manualForm.comprador_nome || null,
        comprador_telefone: manualForm.comprador_telefone || null,
        observacao: manualForm.observacao || null,
      }});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-page"] });
      setShowManualModal(false);
      setManualForm(emptyManualSale);
      sonnerToast.success("Venda registrada com sucesso!");
    },
    onError: () => {
      sonnerToast.error("Erro ao registrar venda. Tente novamente.");
    },
  });

  // Mutation para atualizar status do veículo
  const updateStatusMutation = useMutation({
    mutationFn: async ({ vehicleId, newStatus }: { vehicleId: string; newStatus: VehicleStatus }) => {
      await apiFetch(dataUrl("sale-vehicle-status"), { method: "PATCH", body: { vehicleId, status: newStatus } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-page"] });
      sonnerToast.success("Status atualizado com sucesso!");
    },
    onError: () => {
      sonnerToast.error("Erro ao atualizar status. Tente novamente.");
    },
  });

  const handleStatusChange = (vehicleId: string, newStatus: string) => {
    updateStatusMutation.mutate({ vehicleId, newStatus: newStatus as VehicleStatus });
  };

  const getFormData = (vehicleId: string): SaleFormData => {
    const saleFromDb = salesData?.[vehicleId];
    const localEdit = localEdits[vehicleId] || {};
    return {
      compradorNome: localEdit.compradorNome ?? saleFromDb?.comprador_nome ?? "",
      compradorTelefone: localEdit.compradorTelefone ?? saleFromDb?.comprador_telefone ?? "",
      precoVenda: localEdit.precoVenda ?? saleFromDb?.preco_venda ?? null,
      formaPagamento: localEdit.formaPagamento ?? saleFromDb?.forma_pagamento ?? null,
      valorEntrada: localEdit.valorEntrada ?? saleFromDb?.valor_entrada ?? null,
      valorFinanciamento: localEdit.valorFinanciamento ?? saleFromDb?.valor_financiamento ?? null,
      dataVenda: localEdit.dataVenda ?? saleFromDb?.data_venda ?? "",
    };
  };

  const updateLocalEdit = (vehicleId: string, field: keyof SaleFormData, value: unknown) => {
    setLocalEdits((prev) => ({
      ...prev,
      [vehicleId]: { ...prev[vehicleId], [field]: value },
    }));
  };

  const handleSave = (vehicleId: string) => {
    const formData = getFormData(vehicleId);
    saveSaleMutation.mutate({ vehicleId, data: formData });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "Sem data";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };

  const isManualFormValid = manualForm.preco_venda && manualForm.data_venda;

  const totalSalesValue = useMemo(() => {
    const stockValue = (soldVehicles || []).reduce((sum, vehicle) => {
      const sale = salesData?.[vehicle.vehicle_id];
      return sum + (sale?.preco_venda || vehicle.preco || 0);
    }, 0);

    const manualValue = (manualSales || []).reduce((sum, sale) => sum + (sale.preco_venda || 0), 0);
    return stockValue + manualValue;
  }, [manualSales, salesData, soldVehicles]);

  const financedCount = useMemo(() => {
    const stockFinanced = Object.values(salesData || {}).filter((sale) => sale?.forma_pagamento === "financiado").length;
    const manualFinanced = (manualSales || []).filter((sale) => sale.forma_pagamento === "financiado").length;
    return stockFinanced + manualFinanced;
  }, [manualSales, salesData]);

  const latestSaleDate = useMemo(() => {
    const dates = [
      ...(soldVehicles || []).map((vehicle) => salesData?.[vehicle.vehicle_id]?.data_venda || vehicle.sold_at?.slice(0, 10) || null),
      ...(manualSales || []).map((sale) => sale.data_venda || null),
    ].filter(Boolean) as string[];

    if (dates.length === 0) return null;
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [manualSales, salesData, soldVehicles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSales = (soldVehicles?.length || 0) + (manualSales?.length || 0);
  const stockSalesCount = soldVehicles?.length || 0;
  const manualSalesCount = manualSales?.length || 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-white/[0.06] bg-[linear-gradient(145deg,rgba(11,18,34,0.98),rgba(7,10,22,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_28%),radial-gradient(circle_at_left,rgba(59,130,246,0.10),transparent_28%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              Operação Comercial
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Vendas</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Centralize o fechamento dos negócios, acompanhe o ritmo comercial e refine cada venda com uma visão mais clara de valor, pagamento e comprador.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Volume total</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{totalSales} vendas registradas</p>
                <p className="mt-1 text-sm text-blue-300">{stockSalesCount} estoque • {manualSalesCount} manuais</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Receita movimentada</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{formatCurrency(totalSalesValue)}</p>
                <p className="mt-1 text-sm text-emerald-300">Fluxo consolidado da carteira</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Último fechamento</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{latestSaleDate ? formatDate(latestSaleDate) : "Sem registro"}</p>
                <p className="mt-1 text-sm text-violet-300">Atualizado com base nas vendas salvas</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:w-[430px]">
            <div className="rounded-[24px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
                  <BadgeDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Ticket médio</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{formatCurrency(totalSales ? totalSalesValue / totalSales : 0)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-blue-500/10 bg-gradient-to-br from-blue-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Financiadas</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{financedCount}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-violet-500/10 bg-gradient-to-br from-violet-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
                  <CarFront className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Estoque vendido</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{stockSalesCount}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-amber-500/10 bg-gradient-to-br from-amber-500/12 to-transparent p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-300">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Manuais</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground tabular-nums">{manualSalesCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mesa de fechamento</h2>
          <p className="text-sm text-muted-foreground">Registre, revise e atualize vendas do estoque e manuais sem sair da operação.</p>
        </div>

        <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-2xl bg-[linear-gradient(135deg,#22c55e,#38bdf8)] px-5 text-slate-950 hover:shadow-[0_16px_40px_rgba(34,197,94,0.28)] transition-all border-0">
              <Plus className="h-4 w-4" />
              Adicionar Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-white/[0.06] bg-[linear-gradient(180deg,rgba(14,19,33,0.98),rgba(10,14,26,0.98))] p-0 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <DialogHeader>
              <div className="border-b border-white/[0.06] px-6 py-5">
                <DialogTitle className="text-xl text-foreground">Registrar Venda Manual</DialogTitle>
                <p className="mt-2 text-sm text-muted-foreground">Cadastre negócios externos ao estoque mantendo o mesmo padrão operacional da mesa de vendas.</p>
              </div>
            </DialogHeader>
            <div className="space-y-5 px-6 py-5">
              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Dados do Veículo</Label>
                <div className="mt-4 space-y-3">
                  <Input className={inputClassName} placeholder="Nome do veículo" value={manualForm.nome_veiculo} onChange={(e) => setManualForm((p) => ({ ...p, nome_veiculo: e.target.value }))} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input className={inputClassName} placeholder="Marca" value={manualForm.marca_veiculo} onChange={(e) => setManualForm((p) => ({ ...p, marca_veiculo: e.target.value }))} />
                    <Input className={inputClassName} placeholder="Modelo" value={manualForm.modelo_veiculo} onChange={(e) => setManualForm((p) => ({ ...p, modelo_veiculo: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input className={inputClassName} type="number" placeholder="Ano" value={manualForm.ano_veiculo} onChange={(e) => setManualForm((p) => ({ ...p, ano_veiculo: e.target.value }))} />
                    <Input className={inputClassName} type="number" placeholder="KM (opcional)" value={manualForm.km_veiculo} onChange={(e) => setManualForm((p) => ({ ...p, km_veiculo: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Dados da Venda</Label>
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-foreground">Preço de Venda *</Label>
                      <Input className={inputClassName} type="number" placeholder="0" value={manualForm.preco_venda} onChange={(e) => setManualForm((p) => ({ ...p, preco_venda: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-foreground">Data da Venda *</Label>
                      <Input className={inputClassName} type="date" value={manualForm.data_venda} onChange={(e) => setManualForm((p) => ({ ...p, data_venda: e.target.value }))} />
                    </div>
                  </div>
                  <Select value={manualForm.forma_pagamento} onValueChange={(v) => setManualForm((p) => ({ ...p, forma_pagamento: v }))}>
                    <SelectTrigger className={`${inputClassName} justify-between`}>
                      <SelectValue placeholder="Forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avista">À Vista</SelectItem>
                      <SelectItem value="financiado">Financiado</SelectItem>
                    </SelectContent>
                  </Select>
                  {manualForm.forma_pagamento === "financiado" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input className={inputClassName} type="number" placeholder="Valor entrada" value={manualForm.valor_entrada} onChange={(e) => setManualForm((p) => ({ ...p, valor_entrada: e.target.value }))} />
                      <Input className={inputClassName} type="number" placeholder="Valor financiado" value={manualForm.valor_financiamento} onChange={(e) => setManualForm((p) => ({ ...p, valor_financiamento: e.target.value }))} />
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Comprador</Label>
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input className={inputClassName} placeholder="Nome" value={manualForm.comprador_nome} onChange={(e) => setManualForm((p) => ({ ...p, comprador_nome: e.target.value }))} />
                    <Input className={inputClassName} placeholder="Telefone" value={manualForm.comprador_telefone} onChange={(e) => setManualForm((p) => ({ ...p, comprador_telefone: e.target.value }))} />
                  </div>
                  <Textarea className="min-h-[96px] rounded-2xl border-white/[0.08] bg-white/[0.03]" placeholder="Observação (opcional)" value={manualForm.observacao} onChange={(e) => setManualForm((p) => ({ ...p, observacao: e.target.value }))} rows={3} />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Preencha preço e data para liberar o cadastro manual.</p>
                <Button
                  className="rounded-2xl bg-[linear-gradient(135deg,#22c55e,#38bdf8)] px-6 text-slate-950 hover:shadow-[0_16px_40px_rgba(34,197,94,0.28)] border-0"
                  disabled={!isManualFormValid || createManualSaleMutation.isPending}
                  onClick={() => createManualSaleMutation.mutate()}
                >
                  {createManualSaleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Venda
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {totalSales === 0 ? (
        <div className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(14,19,33,0.98),rgba(10,14,26,0.98))] p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
            <DollarSign className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-foreground">Nenhuma venda registrada</h3>
          <p className="mb-5 text-muted-foreground">
            Marque veículos como "Vendido" ou clique em "+ Adicionar Venda" para registrar.
          </p>
          <Button onClick={() => navigate("/veiculos")} className="rounded-2xl bg-[linear-gradient(135deg,#22c55e,#38bdf8)] px-5 text-slate-950 border-0">
            Ir para Veículos
          </Button>
        </div>
      ) : (
        <>
          {salesData && <SalesCharts salesData={salesData} />}

          {manualSales && manualSales.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Vendas Manuais</h2>
                  <p className="text-sm text-muted-foreground">Negócios lançados fora do fluxo do estoque, mantendo histórico e forma de pagamento.</p>
                </div>
                <Badge className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground">
                  {manualSales.length} registro{manualSales.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {manualSales.map((sale) => (
                  <Card key={sale.id} className="overflow-hidden rounded-[26px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(18,24,40,0.96),rgba(11,15,28,0.96))] p-0 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
                    <div className="border-b border-white/[0.05] p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge variant="secondary" className="mb-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-blue-200/80">Manual</Badge>
                          <h3 className="text-lg font-semibold text-foreground">
                            {(sale as { nome_veiculo?: string }).nome_veiculo || "Veículo não informado"}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {[(sale as { marca_veiculo?: string }).marca_veiculo, (sale as { modelo_veiculo?: string }).modelo_veiculo, (sale as { ano_veiculo?: number }).ano_veiculo].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
                          <ArrowUpRight className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Preço</p>
                          <p className="mt-2 text-lg font-semibold text-emerald-300">{formatCurrency(sale.preco_venda)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Data</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{formatDate(sale.data_venda)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Pagamento</p>
                          <p className="mt-2 text-sm font-medium text-foreground">{sale.forma_pagamento === "avista" ? "À Vista" : sale.forma_pagamento === "financiado" ? "Financiado" : "Não informado"}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Comprador</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{sale.comprador_nome || "Não informado"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{sale.comprador_telefone || "Sem telefone"}</p>
                      </div>

                      {sale.observacao && (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-muted-foreground">
                          {sale.observacao}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {soldVehicles && soldVehicles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Vendas do Estoque</h2>
                  <p className="text-sm text-muted-foreground">Fechamentos originados do inventário, com dados de comprador, preço final e forma de pagamento.</p>
                </div>
                <Badge className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground">
                  {soldVehicles.length} veículo{soldVehicles.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {soldVehicles.map((vehicle) => {
                const formData = getFormData(vehicle.vehicle_id);
                const isFinanciado = formData.formaPagamento === "financiado";
                const precoTabela = vehicle.preco || 0;
                const precoVenda = formData.precoVenda || 0;
                const desconto = precoTabela - precoVenda;
                const temDesconto = precoVenda > 0 && precoVenda < precoTabela;

                return (
                  <Card key={vehicle.vehicle_id} className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(17,23,39,0.97),rgba(10,14,26,0.97))] p-0 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
                    <div className="border-b border-white/[0.05] px-6 py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <Badge variant="default" className="mb-3 rounded-full border-0 bg-white/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-blue-100">{vehicle.marca}</Badge>
                          <h3 
                            className="cursor-pointer truncate text-lg font-semibold text-foreground transition-colors hover:text-primary"
                            onClick={() => navigate(`/veiculos/${vehicle.vehicle_id}`)}
                          >
                            {vehicle.title || "Sem título"}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">{[vehicle.modelo, vehicle.ano].filter(Boolean).join(" • ")}</p>
                        </div>
                        <Select
                          value={vehicle.status || "vendido"}
                          onValueChange={(value) => handleStatusChange(vehicle.vehicle_id, value)}
                        >
                          <SelectTrigger className={`h-8 w-auto rounded-full border px-3 text-xs ${statusConfig[vehicle.status || "vendido"].className}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border z-50">
                            <SelectItem value="disponivel" className="text-green-400">Disponível</SelectItem>
                            <SelectItem value="negociando" className="text-yellow-400">Negociando</SelectItem>
                            <SelectItem value="vendido" className="text-red-400">Vendido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-5 p-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tabela</p>
                          <p className="mt-2 text-lg font-medium text-foreground">{formatCurrency(vehicle.preco)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Venda</p>
                          <p className="mt-2 text-lg font-semibold text-emerald-300">{formatCurrency(formData.precoVenda)}</p>
                        </div>
                        <div>
                          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Variação</p>
                            <p className={`mt-2 text-lg font-semibold ${temDesconto ? "text-amber-300" : "text-blue-300"}`}>{temDesconto ? `-${formatCurrency(desconto)}` : "Sem desconto"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.025] p-5">
                        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Comprador</Label>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Input className={inputClassName} placeholder="Nome do comprador" value={formData.compradorNome} onChange={(e) => updateLocalEdit(vehicle.vehicle_id, "compradorNome", e.target.value)} />
                          <Input className={inputClassName} placeholder="Telefone" value={formData.compradorTelefone} onChange={(e) => updateLocalEdit(vehicle.vehicle_id, "compradorTelefone", e.target.value)} />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.025] p-5">
                        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Fechamento</Label>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm text-foreground">Preço de Venda</Label>
                            <Input className={inputClassName} type="number" placeholder="0" value={formData.precoVenda ?? ""} onChange={(e) => updateLocalEdit(vehicle.vehicle_id, "precoVenda", e.target.value ? Number(e.target.value) : null)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm text-foreground">Data da Venda</Label>
                            <Input className={inputClassName} type="date" value={formData.dataVenda} onChange={(e) => updateLocalEdit(vehicle.vehicle_id, "dataVenda", e.target.value)} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.025] p-5">
                        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Forma de Pagamento</Label>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <Button type="button" variant={formData.formaPagamento === "avista" ? "default" : "outline"} className="h-11 flex-1 rounded-2xl border-white/[0.08] bg-white/[0.03]" onClick={() => { updateLocalEdit(vehicle.vehicle_id, "formaPagamento", "avista"); updateLocalEdit(vehicle.vehicle_id, "valorEntrada", null); updateLocalEdit(vehicle.vehicle_id, "valorFinanciamento", null); }}>
                            <Banknote className="mr-2 h-4 w-4" />À Vista
                          </Button>
                          <Button type="button" variant={formData.formaPagamento === "financiado" ? "default" : "outline"} className="h-11 flex-1 rounded-2xl border-white/[0.08] bg-white/[0.03]" onClick={() => updateLocalEdit(vehicle.vehicle_id, "formaPagamento", "financiado")}>
                            <CreditCard className="mr-2 h-4 w-4" />Financiado
                          </Button>
                        </div>
                      </div>

                      {isFinanciado && (
                        <div className="grid gap-3 rounded-[24px] border border-white/[0.06] bg-white/[0.025] p-5 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm text-foreground">Valor da Entrada</Label>
                            <Input className={inputClassName} type="number" placeholder="0" value={formData.valorEntrada ?? ""} onChange={(e) => updateLocalEdit(vehicle.vehicle_id, "valorEntrada", e.target.value ? Number(e.target.value) : null)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm text-foreground">Valor Financiado</Label>
                            <Input className={inputClassName} type="number" placeholder="0" value={formData.valorFinanciamento ?? ""} onChange={(e) => updateLocalEdit(vehicle.vehicle_id, "valorFinanciamento", e.target.value ? Number(e.target.value) : null)} />
                          </div>
                        </div>
                      )}

                      {isFinanciado && (formData.valorEntrada || formData.valorFinanciamento) && (
                        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Entrada:</span>
                            <span className="font-medium text-foreground">{formatCurrency(formData.valorEntrada)}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Financiado:</span>
                            <span className="font-medium text-foreground">{formatCurrency(formData.valorFinanciamento)}</span>
                          </div>
                          <div className="mt-2 flex justify-between border-t border-blue-500/20 pt-2 text-sm">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-semibold text-primary">{formatCurrency((formData.valorEntrada || 0) + (formData.valorFinanciamento || 0))}</span>
                          </div>
                        </div>
                      )}

                      {temDesconto && (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-amber-300">Desconto aplicado</span>
                            <span className="font-semibold text-amber-300">{formatCurrency(desconto)}</span>
                          </div>
                        </div>
                      )}

                      <Button className="h-11 w-full rounded-2xl bg-[linear-gradient(135deg,#22c55e,#38bdf8)] text-slate-950 hover:shadow-[0_16px_40px_rgba(34,197,94,0.25)] border-0" onClick={() => handleSave(vehicle.vehicle_id)} disabled={saveSaleMutation.isPending}>
                        {saveSaleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Informações
                      </Button>
                    </div>
                  </Card>
                );
              })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Vendas;
