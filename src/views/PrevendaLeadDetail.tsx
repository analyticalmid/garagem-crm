import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Save, User, Calendar, Phone, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, dataUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PrevendaLeadStatus, PREVENDA_KANBAN_COLUMNS } from '@/types/prevendaLead';

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

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PrevendaLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Form state
  const [status, setStatus] = useState<PrevendaLeadStatus>('novo_lead');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [veiculoNome, setVeiculoNome] = useState('');
  const [veiculoMarca, setVeiculoMarca] = useState('');
  const [veiculoModelo, setVeiculoModelo] = useState('');
  const [veiculoKm, setVeiculoKm] = useState<string>('');
  const [veiculoCambio, setVeiculoCambio] = useState('');
  const [veiculoAnoFab, setVeiculoAnoFab] = useState<string>('');
  const [veiculoAnoMod, setVeiculoAnoMod] = useState<string>('');
  const [veiculoValor, setVeiculoValor] = useState<string>('');

  // Fetch lead data
  const { data: lead, isLoading } = useQuery({
    queryKey: ['prevenda-lead', id],
    queryFn: async () => {
      return apiFetch<any>(dataUrl('prevenda-lead', { id: parseInt(id!, 10) }));
    },
    enabled: !!id,
  });

  // Fetch profiles for responsible dropdown
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-active'],
    queryFn: async () => {
      return apiFetch<{ id: string; full_name: string | null; email: string | null }[]>(dataUrl('profiles-active'));
    },
  });

  // Populate form when lead loads
  useEffect(() => {
    if (lead) {
      setStatus((lead.status as PrevendaLeadStatus) || 'novo_lead');
      setAssignedTo(lead.assigned_to);
      setObservacao(lead.observacao || '');
      setVeiculoNome(lead.veiculo_nome || '');
      setVeiculoMarca(lead.veiculo_marca || '');
      setVeiculoModelo(lead.veiculo_modelo || '');
      setVeiculoKm(lead.veiculo_km?.toString() || '');
      setVeiculoCambio(lead.veiculo_cambio || '');
      setVeiculoAnoFab(lead.veiculo_ano_fab?.toString() || '');
      setVeiculoAnoMod(lead.veiculo_ano_mod?.toString() || '');
      setVeiculoValor(lead.veiculo_valor?.toString() || '');
    }
  }, [lead]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(dataUrl('prevenda-lead'), {
        method: 'PATCH',
        body: {
          id: parseInt(id!, 10),
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
      queryClient.invalidateQueries({ queryKey: ['prevenda-lead', id] });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead não encontrado.</p>
        <Button variant="link" onClick={() => navigate('/prevenda')}>
          Voltar ao pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/prevenda')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {lead.nome || 'Sem nome'}
          </h1>
          <p className="text-sm text-muted-foreground">Lead de Prospecção</p>
        </div>
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="rounded-xl bg-gradient-to-r from-primary to-blue-400 hover:shadow-lg hover:shadow-primary/20 transition-all border-0">
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lead Info */}
        <Card className="glass rounded-2xl border-white/[0.05]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{formatPhone(lead.telefone_whatsapp) || 'Sem telefone'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                Criado em {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PrevendaLeadStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREVENDA_KANBAN_COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={assignedTo || ''} onValueChange={(v) => setAssignedTo(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card className="glass rounded-2xl border-white/[0.05]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5" />
              Veículo do Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="veiculo_nome">Nome do veículo</Label>
              <Input
                id="veiculo_nome"
                value={veiculoNome}
                onChange={(e) => setVeiculoNome(e.target.value)}
                placeholder="Ex: Civic EXL 2020"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="veiculo_marca">Marca</Label>
                <Input
                  id="veiculo_marca"
                  value={veiculoMarca}
                  onChange={(e) => setVeiculoMarca(e.target.value)}
                  placeholder="Ex: Honda"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo_modelo">Modelo</Label>
                <Input
                  id="veiculo_modelo"
                  value={veiculoModelo}
                  onChange={(e) => setVeiculoModelo(e.target.value)}
                  placeholder="Ex: Civic"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="veiculo_km">Quilometragem</Label>
                <Input
                  id="veiculo_km"
                  type="number"
                  value={veiculoKm}
                  onChange={(e) => setVeiculoKm(e.target.value)}
                  placeholder="Ex: 45000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo_cambio">Câmbio</Label>
                <Select value={veiculoCambio} onValueChange={setVeiculoCambio}>
                  <SelectTrigger id="veiculo_cambio">
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
                <Label htmlFor="veiculo_ano_fab">Ano Fabricação</Label>
                <Input
                  id="veiculo_ano_fab"
                  type="number"
                  value={veiculoAnoFab}
                  onChange={(e) => setVeiculoAnoFab(e.target.value)}
                  placeholder="Ex: 2020"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo_ano_mod">Ano Modelo</Label>
                <Input
                  id="veiculo_ano_mod"
                  type="number"
                  value={veiculoAnoMod}
                  onChange={(e) => setVeiculoAnoMod(e.target.value)}
                  placeholder="Ex: 2021"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="veiculo_valor">Valor (R$)</Label>
              <Input
                id="veiculo_valor"
                type="number"
                step="0.01"
                value={veiculoValor}
                onChange={(e) => setVeiculoValor(e.target.value)}
                placeholder="Ex: 85000.00"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Observations */}
      <Card className="glass rounded-2xl border-white/[0.05]">
        <CardHeader>
          <CardTitle className="text-lg">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Anotações sobre o lead..."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
