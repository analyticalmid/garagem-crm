import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Car, Fuel, Calendar, Gauge, Palette, Settings, Loader2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getSafeExternalUrl } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { apiFetch, dataUrl } from "@/lib/api";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

const getStatusBadge = (status: VehicleStatus | null) => {
  switch (status) {
    case "disponivel":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Disponível</Badge>;
    case "negociando":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Negociando</Badge>;
    case "vendido":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Vendido</Badge>;
    default:
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Disponível</Badge>;
  }
};

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [observacoes, setObservacoes] = useState("");

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      return apiFetch<any>(dataUrl("vehicle", { id }));
    },
  });

  useEffect(() => {
    if (vehicle?.observacoes) {
      setObservacoes(vehicle.observacoes);
    }
  }, [vehicle]);

  const saveObservacoesMutation = useMutation({
    mutationFn: async (novasObs: string) => {
      await apiFetch(dataUrl("vehicle-observacoes"), { method: "PATCH", body: { id, observacoes: novasObs } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
      toast({ title: "Salvo", description: "Observações salvas com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar observações", variant: "destructive" });
    },
  });

  const handleSaveObservacoes = () => {
    saveObservacoesMutation.mutate(observacoes);
  };

const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: VehicleStatus) => {
      await apiFetch(dataUrl("vehicle-status"), { method: "PATCH", body: { id, status: newStatus } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-all"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-sold"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast({ title: "Sucesso", description: "Status atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao atualizar status", variant: "destructive" });
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "Consulte";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatKm = (value: number | null) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("pt-BR").format(value) + " km";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/veiculos")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          Veículo não encontrado.
        </div>
      </div>
    );
  }

  const externalVehicleLink = getSafeExternalUrl(vehicle.link);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/veiculos")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        {externalVehicleLink && (
          <Button
            asChild
            className="rounded-xl bg-gradient-to-r from-primary to-blue-400 hover:shadow-lg hover:shadow-primary/20 transition-all border-0"
          >
            <a
              href={externalVehicleLink}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Ver Anúncio Original
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 glass rounded-2xl border-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-foreground">Informações do Veículo</h2>
            </div>
            {getStatusBadge(vehicle.status)}
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground">{vehicle.title}</h3>
              <p className="text-muted-foreground">
                {vehicle.marca} {vehicle.modelo}
              </p>
            </div>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(vehicle.preco)}
            </div>
            {vehicle.codigo && (
              <p className="text-sm text-muted-foreground">
                Código: {vehicle.codigo}
              </p>
            )}
            
            <div className="pt-4 border-t border-white/[0.05]">
              <Label className="text-foreground">Alterar Status</Label>
              <Select
                value={vehicle.status || "disponivel"}
                onValueChange={(value) => updateStatusMutation.mutate(value as VehicleStatus)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="negociando">Negociando</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass rounded-2xl border-white/[0.05]">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Especificações</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
              <Calendar className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Ano</p>
                <p className="font-semibold text-foreground">{vehicle.ano || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
              <Gauge className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm text-muted-foreground">Quilometragem</p>
                <p className="font-semibold text-foreground">{formatKm(vehicle.km)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
              <Fuel className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm text-muted-foreground">Combustível</p>
                <p className="font-semibold text-foreground">{vehicle.combustivel || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
              <Settings className="h-5 w-5 text-violet-400" />
              <div>
                <p className="text-sm text-muted-foreground">Câmbio</p>
                <p className="font-semibold text-foreground">{vehicle.cambio || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl col-span-2">
              <Palette className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm text-muted-foreground">Cor</p>
                <p className="font-semibold text-foreground">{vehicle.cor || "N/A"}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 glass rounded-2xl border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Observações</h2>
          <Button onClick={handleSaveObservacoes} size="sm" disabled={saveObservacoesMutation.isPending} className="rounded-xl bg-gradient-to-r from-primary to-blue-400 hover:shadow-lg hover:shadow-primary/20 transition-all border-0">
            {saveObservacoesMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
        <div>
          <Label htmlFor="observacoes" className="sr-only">Observações</Label>
          <Textarea
            id="observacoes"
            placeholder="Adicione observações sobre o veículo... Ex: Foi feita manutenção no motor"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            className="resize-none bg-white/[0.03] border-white/[0.06] rounded-xl"
          />
        </div>
      </Card>
    </div>
  );
};

export default VehicleDetail;
