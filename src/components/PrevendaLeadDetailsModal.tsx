import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Car, Loader2, MessageCircleMore, Save, Shield, Sparkles, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, dataUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PrevendaLead, PrevendaLeadStatus, PREVENDA_KANBAN_COLUMNS } from '@/types/prevendaLead';

interface PrevendaLeadDetailsModalProps {
  lead: PrevendaLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/@.*$/, '').replace(/\D/g, '');
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 8);
    const part2 = cleaned.slice(8);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  return phone;
}

export function PrevendaLeadDetailsModal({ lead, open, onOpenChange }: PrevendaLeadDetailsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [status, setStatus] = useState<PrevendaLeadStatus>('novo_lead');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [veiculoNome, setVeiculoNome] = useState('');
  const [veiculoMarca, setVeiculoMarca] = useState('');
  const [veiculoModelo, setVeiculoModelo] = useState('');
  const [veiculoKm, setVeiculoKm] = useState('');
  const [veiculoCambio, setVeiculoCambio] = useState('');
  const [veiculoAnoFab, setVeiculoAnoFab] = useState('');
  const [veiculoAnoMod, setVeiculoAnoMod] = useState('');
  const [veiculoValor, setVeiculoValor] = useState('');

  const leadId = lead?.id ?? null;

  const { data: leadRecord, isLoading } = useQuery({
    queryKey: ['prevenda-lead', leadId],
    queryFn: async () => {
      return apiFetch<any>(dataUrl('prevenda-lead', { id: leadId }));
    },
    enabled: open && Boolean(leadId),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-active'],
    queryFn: async () => {
      return apiFetch<{ id: string; full_name: string | null; email: string | null }[]>(dataUrl('profiles-active'));
    },
    enabled: open,
  });

  useEffect(() => {
    if (leadRecord) {
      setStatus((leadRecord.status as PrevendaLeadStatus) || 'novo_lead');
      setAssignedTo(leadRecord.assigned_to);
      setObservacao(leadRecord.observacao || '');
      setVeiculoNome(leadRecord.veiculo_nome || '');
      setVeiculoMarca(leadRecord.veiculo_marca || '');
      setVeiculoModelo(leadRecord.veiculo_modelo || '');
      setVeiculoKm(leadRecord.veiculo_km?.toString() || '');
      setVeiculoCambio(leadRecord.veiculo_cambio || '');
      setVeiculoAnoFab(leadRecord.veiculo_ano_fab?.toString() || '');
      setVeiculoAnoMod(leadRecord.veiculo_ano_mod?.toString() || '');
      setVeiculoValor(leadRecord.veiculo_valor?.toString() || '');
    }
  }, [leadRecord]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(dataUrl('prevenda-lead'), {
        method: 'PATCH',
        body: {
          id: leadId,
          updates: {
          status,
          assigned_to: user?.id || assignedTo,
          observacao,
          veiculo_nome: veiculoNome || null,
          veiculo_marca: veiculoMarca || null,
          veiculo_modelo: veiculoModelo || null,
          veiculo_km: veiculoKm ? parseInt(veiculoKm, 10) : null,
          veiculo_cambio: veiculoCambio || null,
          veiculo_ano_fab: veiculoAnoFab ? parseInt(veiculoAnoFab, 10) : null,
          veiculo_ano_mod: veiculoAnoMod ? parseInt(veiculoAnoMod, 10) : null,
          veiculo_valor: veiculoValor ? parseFloat(veiculoValor.replace(',', '.')) : null,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prevenda-leads'] });
      queryClient.invalidateQueries({ queryKey: ['prevenda-lead', leadId] });
      toast({
        title: 'Lead atualizado',
        description: 'As informações foram salvas com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar o lead.',
        variant: 'destructive',
      });
    },
  });

  const initials = useMemo(() => {
    return (leadRecord?.nome || lead?.nome || 'Sem nome')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'SL';
  }, [leadRecord?.nome, lead?.nome]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[72rem] border-white/[0.06] bg-transparent p-0 shadow-none sm:rounded-[28px]">
        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[linear-gradient(160deg,rgba(14,20,36,0.98),rgba(8,12,24,0.96))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.16),transparent_28%),radial-gradient(circle_at_left,rgba(45,212,191,0.10),transparent_24%)]" />

          <DialogHeader className="relative border-b border-white/[0.06] px-7 pb-5 pt-7">
            <div className="flex flex-col gap-5 pr-10 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-sky-400/20 bg-sky-400/10 text-lg font-semibold text-foreground shadow-[0_12px_30px_rgba(96,165,250,0.18)]">
                  {initials}
                </div>

                <div className="space-y-2 text-left">
                  <DialogTitle className="text-2xl font-semibold text-foreground">
                    {leadRecord?.nome || lead?.nome || 'Sem nome'}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                      <MessageCircleMore className="h-4 w-4 text-emerald-400" />
                      {formatPhone(leadRecord?.telefone_whatsapp || lead?.telefone_whatsapp) || 'Sem telefone'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                      <CalendarDays className="h-4 w-4 text-blue-300" />
                      {leadRecord?.created_at ? format(new Date(leadRecord.created_at), "dd/MM/yyyy 'às' HH:mm") : 'Data indisponível'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      Prospecção CRM
                    </span>
                  </DialogDescription>
                </div>
              </div>

              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || isLoading || !leadRecord}
                className="rounded-xl bg-gradient-to-r from-primary to-blue-400 border-0 hover:shadow-lg hover:shadow-primary/20"
              >
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </DialogHeader>

          <div className="relative max-h-[72vh] overflow-y-auto px-7 py-7">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !leadRecord ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                Lead não encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card className="glass rounded-[24px] border-white/[0.05] p-5">
                  <h2 className="mb-5 text-lg font-semibold text-foreground">Informações do Lead</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={(value) => setStatus(value as PrevendaLeadStatus)}>
                        <SelectTrigger className="rounded-xl border-white/[0.06] bg-white/[0.03]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PREVENDA_KANBAN_COLUMNS.map((column) => (
                            <SelectItem key={column.id} value={column.id}>
                              {column.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-foreground">
                        <Shield className="h-4 w-4 text-blue-300" />
                        Responsável
                      </Label>
                      <Select value={assignedTo || 'none'} onValueChange={(value) => setAssignedTo(value === 'none' ? null : value)}>
                        <SelectTrigger className="rounded-xl border-white/[0.06] bg-white/[0.03]">
                          <SelectValue placeholder="Selecionar responsável" />
                        </SelectTrigger>
                        <SelectContent className="border-white/[0.08] bg-card">
                          <SelectItem value="none">Sem responsável</SelectItem>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name || profile.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prevenda-veiculo-nome">Nome do veículo</Label>
                      <Input
                        id="prevenda-veiculo-nome"
                        value={veiculoNome}
                        onChange={(event) => setVeiculoNome(event.target.value)}
                        placeholder="Ex: Civic EXL 2020"
                        className="rounded-xl border-white/[0.06] bg-white/[0.03]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prevenda-veiculo-marca">Marca</Label>
                        <Input
                          id="prevenda-veiculo-marca"
                          value={veiculoMarca}
                          onChange={(event) => setVeiculoMarca(event.target.value)}
                          className="rounded-xl border-white/[0.06] bg-white/[0.03]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prevenda-veiculo-modelo">Modelo</Label>
                        <Input
                          id="prevenda-veiculo-modelo"
                          value={veiculoModelo}
                          onChange={(event) => setVeiculoModelo(event.target.value)}
                          className="rounded-xl border-white/[0.06] bg-white/[0.03]"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="glass rounded-[24px] border-white/[0.05] p-5">
                  <h2 className="mb-5 text-lg font-semibold text-foreground">Veículo do Lead</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prevenda-veiculo-km">Quilometragem</Label>
                        <Input
                          id="prevenda-veiculo-km"
                          type="number"
                          value={veiculoKm}
                          onChange={(event) => setVeiculoKm(event.target.value)}
                          className="rounded-xl border-white/[0.06] bg-white/[0.03]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prevenda-veiculo-cambio">Câmbio</Label>
                        <Select value={veiculoCambio} onValueChange={setVeiculoCambio}>
                          <SelectTrigger id="prevenda-veiculo-cambio" className="rounded-xl border-white/[0.06] bg-white/[0.03]">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="automatico">Automático</SelectItem>
                            <SelectItem value="automatizado">Automatizado</SelectItem>
                            <SelectItem value="cvt">CVT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prevenda-veiculo-ano-fab">Ano Fabricação</Label>
                        <Input
                          id="prevenda-veiculo-ano-fab"
                          type="number"
                          value={veiculoAnoFab}
                          onChange={(event) => setVeiculoAnoFab(event.target.value)}
                          className="rounded-xl border-white/[0.06] bg-white/[0.03]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prevenda-veiculo-ano-mod">Ano Modelo</Label>
                        <Input
                          id="prevenda-veiculo-ano-mod"
                          type="number"
                          value={veiculoAnoMod}
                          onChange={(event) => setVeiculoAnoMod(event.target.value)}
                          className="rounded-xl border-white/[0.06] bg-white/[0.03]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prevenda-veiculo-valor" className="flex items-center gap-2 text-foreground">
                        <Car className="h-4 w-4 text-teal-300" />
                        Valor (R$)
                      </Label>
                      <Input
                        id="prevenda-veiculo-valor"
                        type="number"
                        step="0.01"
                        value={veiculoValor}
                        onChange={(event) => setVeiculoValor(event.target.value)}
                        className="rounded-xl border-white/[0.06] bg-white/[0.03]"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="glass rounded-[24px] border-white/[0.05] p-5 lg:col-span-2">
                  <h2 className="mb-5 text-lg font-semibold text-foreground">Observações</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="prevenda-observacao" className="flex items-center gap-2 text-foreground">
                        <UserCheck className="h-4 w-4 text-violet-300" />
                        Contexto comercial
                      </Label>
                      <Textarea
                        id="prevenda-observacao"
                        placeholder="Anotações sobre o lead..."
                        value={observacao}
                        onChange={(event) => setObservacao(event.target.value)}
                        rows={4}
                        className="mt-2 min-h-[160px] rounded-xl border-white/[0.06] bg-white/[0.03]"
                      />
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
