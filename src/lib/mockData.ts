export const mockUsuarios = [
  { id: "1", nome: "João Silva", cargo: "Vendedor", whatsapp: "+5511999999999", ativo: true },
  { id: "2", nome: "Maria Santos", cargo: "Gerente", whatsapp: "+5511888888888", ativo: true },
  { id: "3", nome: "Pedro Costa", cargo: "Vendedor", whatsapp: "+5511777777777", ativo: false },
];

export const mockLeads = [
  {
    id: "1",
    cliente_id: "1",
    vehicle_id: "CIVIC-2024",
    status: "novo",
    origem: "Instagram",
    canal: "Direct",
    observacoes: "Interessado em Honda Civic 2024",
    operacao: "Revisão completa realizada - Troca de óleo e filtros",
    responsavel_id: "1",
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: "2",
    cliente_id: "2",
    vehicle_id: "COROLLA-2023",
    status: "contato",
    origem: "Facebook",
    canal: "Messenger",
    observacoes: "Quer test drive",
    operacao: "Ajuste nos freios antes da entrega",
    responsavel_id: "2",
    created_at: "2025-01-14T15:30:00Z",
  },
  {
    id: "3",
    cliente_id: "3",
    vehicle_id: "HRV-2024",
    status: "negociacao",
    origem: "WhatsApp",
    canal: "WhatsApp Business",
    observacoes: "Proposta enviada",
    operacao: "Aguardando peças para manutenção preventiva",
    responsavel_id: "1",
    created_at: "2025-01-13T09:15:00Z",
  },
];

export const mockInteracoes = [
  {
    id: "1",
    lead_id: "1",
    tipo: "mensagem_cliente",
    origem: "Instagram",
    conteudo: "Olá, gostaria de saber o preço do Civic 2024",
    autor: "Carlos Mendes",
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: "2",
    lead_id: "1",
    tipo: "mensagem_ia",
    origem: "Sistema",
    conteudo: "Olá Carlos! O Honda Civic 2024 está disponível a partir de R$ 150.000. Gostaria de agendar um test drive?",
    autor: "IA",
    created_at: "2025-01-15T10:01:00Z",
  },
  {
    id: "3",
    lead_id: "1",
    tipo: "acao_humana",
    origem: "Sistema",
    conteudo: "Vendedor assumiu o atendimento",
    autor: "João Silva",
    created_at: "2025-01-15T10:05:00Z",
  },
];

export const mockTarefas = [
  {
    id: "1",
    lead_id: "1",
    responsavel_id: "1",
    descricao: "Ligar para agendar test drive",
    data_hora: "2025-01-16T14:00:00Z",
    status: "pendente",
  },
  {
    id: "2",
    lead_id: "2",
    responsavel_id: "2",
    descricao: "Enviar proposta comercial",
    data_hora: "2025-01-15T16:00:00Z",
    status: "concluida",
  },
];

export const statusOptions = [
  { value: "novo", label: "Novo", color: "bg-blue" },
  { value: "contato", label: "Contato", color: "bg-purple" },
  { value: "negociacao", label: "Negociação", color: "bg-orange" },
  { value: "ganho", label: "Ganho", color: "bg-green-500" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" },
];
