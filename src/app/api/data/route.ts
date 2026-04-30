import { differenceInDays, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient, createSupabaseServiceClient, getBearerToken } from "@/lib/supabase/route";
import { normalizeLeadPhone } from "@/lib/leadPhone";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  ensureUniqueColumnKey,
  getDefaultPipelineColumns,
  getFirstPipelineColumnKey,
  getNegotiatingColumnKey,
  slugifyColumnTitle,
  type PipelineColumn,
  type PipelineKey,
} from "@/lib/kanbanColumns";

type SupabaseRouteClient = ReturnType<typeof createSupabaseRouteClient>;
type AppRole = Database["public"]["Enums"]["app_role"];
type PlanType = Database["public"]["Enums"]["plan_type"];
type LeadStatus = string;
type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type WhatsappMessageRow = Database["public"]["Tables"]["mensagens_whatsapp"]["Row"];
type LooseWhatsappMessageRow = WhatsappMessageRow & Record<string, unknown>;
type PipelineColumnRow = Database["public"]["Tables"]["pipeline_columns_config"]["Row"];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;

function getWhatsappDataClient(supabase: SupabaseRouteClient) {
  return createSupabaseServiceClient() ?? supabase;
}

function mapPipelineColumnRow(row: PipelineColumnRow): PipelineColumn {
  return {
    key: row.column_key,
    title: row.title,
    position: row.position,
    isDefault: row.is_default,
    isActive: row.is_active,
    color: row.color,
  };
}

async function selectPipelineColumns(
  supabase: SupabaseRouteClient,
  pipelineKey: PipelineKey,
) {
  const { data, error } = await supabase
    .from("pipeline_columns_config")
    .select("tenant_id, pipeline_key, column_key, title, position, is_default, is_active, color")
    .eq("pipeline_key", pipelineKey)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error) {
    if (isMissingPipelineColumnsTable(error)) {
      return null;
    }

    throw error;
  }
  return (data || []).map(mapPipelineColumnRow);
}

async function bootstrapPipelineColumns(
  tenantId: string,
  pipelineKey: PipelineKey,
) {
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return getDefaultPipelineColumns(pipelineKey);

  const defaults = getDefaultPipelineColumns(pipelineKey);
  const payload = defaults.map((column) => ({
    tenant_id: tenantId,
    pipeline_key: pipelineKey,
    column_key: column.key,
    title: column.title,
    position: column.position,
    is_default: column.isDefault,
    is_active: true,
    color: column.color,
  }));

  const { error } = await serviceClient.from("pipeline_columns_config").upsert(payload, {
    onConflict: "tenant_id,pipeline_key,column_key",
    ignoreDuplicates: true,
  });

  if (error) throw error;
  return defaults;
}

async function getPipelineColumns(
  session: Awaited<ReturnType<typeof requireSession>>,
  pipelineKey: PipelineKey,
) {
  if (session.planType !== "essencial" || !session.tenantId) {
    return getDefaultPipelineColumns(pipelineKey);
  }

  const existing = await selectPipelineColumns(session.supabase, pipelineKey);
  if (existing === null) {
    return getDefaultPipelineColumns(pipelineKey);
  }
  if (existing.length > 0) return existing;

  await bootstrapPipelineColumns(session.tenantId, pipelineKey);
  const bootstrapped = await selectPipelineColumns(session.supabase, pipelineKey);
  return bootstrapped ?? getDefaultPipelineColumns(pipelineKey);
}

async function assertManagerCanEditPipeline(
  session: Awaited<ReturnType<typeof requireSession>>,
  pipelineKey: PipelineKey,
) {
  if (session.planType !== "essencial" || !session.tenantId) {
    throw new Response(JSON.stringify({ error: "Personalização disponível apenas no plano Essencial." }), { status: 403 });
  }

  if (!session.isManager) {
    throw new Response(JSON.stringify({ error: "Apenas gestores podem alterar colunas do pipeline." }), { status: 403 });
  }

  if (pipelineKey !== "leads" && pipelineKey !== "prevenda") {
    throw new Response(JSON.stringify({ error: "Pipeline inválido." }), { status: 400 });
  }
}

function normalizePipelineKey(value: unknown): PipelineKey {
  return value === "prevenda" ? "prevenda" : "leads";
}

async function ensureValidPipelineStatus(
  session: Awaited<ReturnType<typeof requireSession>>,
  pipelineKey: PipelineKey,
  status: string,
) {
  const columns = await getPipelineColumns(session, pipelineKey);
  const exists = columns.some((column) => column.key === status);
  if (!exists) {
    throw new Response(JSON.stringify({ error: "A coluna informada não existe para este pipeline." }), { status: 400 });
  }
  return columns;
}

// Cache sessão para evitar 2 round-trips ao Supabase por request
type CachedSession = {
  userId: string;
  role: AppRole | null;
  planType: PlanType | null;
  tenantId: string | null;
  expiresAt: number;
};
const sessionCache = new Map<string, CachedSession>();

function jsonError(error: unknown, status = 500) {
  const message =
    typeof error === "object" && error !== null
      ? "message" in error && typeof error.message === "string"
        ? error.message
        : "error" in error && typeof error.error === "string"
          ? error.error
          : JSON.stringify(error)
      : String(error || "Erro interno.");
  return NextResponse.json({ error: message }, { status });
}

function isMissingPipelineColumnsTable(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : String(error || "");

  return (
    message.includes("pipeline_columns_config") &&
    (message.includes("does not exist") || message.includes("schema cache") || message.includes("Could not find"))
  );
}

function pipelineColumnsMigrationMessage() {
  return "A migration do banco para colunas personalizadas ainda não foi aplicada. Rode a migration `20260430130000_add_pipeline_columns_config.sql` no Supabase para liberar esse recurso.";
}

async function requireSession(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createSupabaseRouteClient(request);
  const now = Date.now();
  const cached = sessionCache.get(token);

  let userId: string;
  let role: AppRole | null;
  let planType: PlanType | null;
  let tenantId: string | null;

  if (cached && cached.expiresAt > now) {
    userId = cached.userId;
    role = cached.role;
    planType = cached.planType;
    tenantId = cached.tenantId;
  } else {
    // Parallelizar: decodifica JWT localmente para obter userId e buscar role ao mesmo tempo que valida
    const jwtPayload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const preliminaryUserId: string = jwtPayload.sub;

    const [{ data: authData, error }, { data: roleData }, { data: profileData }] = await Promise.all([
      supabase.auth.getUser(token),
      supabase.from("user_roles").select("role").eq("user_id", preliminaryUserId).maybeSingle(),
      supabase.from("profiles").select("tenant_id, plan_type").eq("id", preliminaryUserId).maybeSingle(),
    ]);

    if (error || !authData.user) {
      throw new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
    }

    userId = authData.user.id;
    role = (roleData?.role ?? null) as AppRole | null;
    planType = (profileData?.plan_type ?? null) as PlanType | null;
    tenantId = profileData?.tenant_id ?? null;

    // Cache por 5 minutos, limpeza periódica
    sessionCache.set(token, { userId, role, planType, tenantId, expiresAt: now + 5 * 60 * 1000 });
    if (sessionCache.size > 500) {
      for (const [key, val] of sessionCache) {
        if (val.expiresAt < now) sessionCache.delete(key);
      }
    }
  }

  const user = { id: userId };
  return {
    supabase,
    user,
    role,
    planType,
    tenantId,
    canViewAllLeads: role === "admin" || role === "gerente",
    canAssignLeads: role === "admin" || role === "gerente",
    isAdmin: role === "admin",
    isManager: role === "admin" || role === "gerente",
    canAccessEssencialFeature: planType === "essencial" || role === "admin" || role === "gerente",
  };
}

function assertEssencialFeature(session: Awaited<ReturnType<typeof requireSession>>) {
  if (!session.canAccessEssencialFeature) {
    throw new Response(
      JSON.stringify({ error: "Recurso disponível apenas no plano Essencial." }),
      { status: 402 },
    );
  }
}

async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

function redactSalePII<T extends {
  comprador_nome?: string | null;
  comprador_telefone?: string | null;
  observacao?: string | null;
}>(sale: T) {
  return {
    ...sale,
    comprador_nome: null,
    comprador_telefone: null,
    observacao: null,
  };
}

function getMessageTimestamp(
  row: Partial<Pick<WhatsappMessageRow, "created_at" | "id">>,
  fallbackIndex = 0,
) {
  if (row.created_at) {
    const ts = Date.parse(row.created_at);
    if (!Number.isNaN(ts)) return ts;
  }

  if (typeof row.id === "number") return row.id;

  if (typeof row.id === "string") {
    const numericId = Number(row.id);
    if (!Number.isNaN(numericId)) return numericId;
  }

  return fallbackIndex;
}

function sortWhatsappMessages(rows: WhatsappMessageRow[]) {
  return [...rows].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
}

function coercePhone(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "t", "1", "yes", "sim"].includes(normalized)) return true;
    if (["false", "f", "0", "no", "nao", "não", ""].includes(normalized)) return false;
  }
  return false;
}

function isJsonRecord(value: Json | null | undefined): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonHistoryEntries(value: Json | null | undefined) {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, Json> => isJsonRecord(entry)) : [];
}

function buildPosVendaHistoryEntry(input: {
  conteudo: string;
  cardId: string;
  telefone: string;
  smartKind?: string | null;
  veiculo?: string | null;
}) {
  return {
    data: new Date().toISOString(),
    tipo_contato: "whatsapp_zapi_mock",
    observacao: input.conteudo,
    canal: "whatsapp",
    status: "enviado",
    card_id: input.cardId,
    telefone: input.telefone,
    smart_kind: input.smartKind || null,
    veiculo: input.veiculo || null,
  } satisfies Record<string, Json>;
}

function isSellerMessage(row: LooseWhatsappMessageRow) {
  return parseBooleanLike(
    row.enviada_pelo_vendedor ?? row.enviado_pelo_vendedor ?? row.enviadaa_pelo_vendedor,
  );
}

async function fetchMensagensAgregadas(supabase: SupabaseRouteClient, select = "chat_id, ia_respondeu") {
  // Primeira página com count para paralelizar as demais
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: firstPage, count, error } = await (supabase as any)
    .from("v_mensagens_por_chat")
    .select(select, { count: "exact" })
    .range(0, PAGE_SIZE - 1);

  if (error) throw error;
  if (!firstPage || firstPage.length < PAGE_SIZE) {
    return (firstPage || []) as unknown as Record<string, unknown>[];
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const remainingFetches = Array.from({ length: totalPages - 1 }, (_, i) =>
    (supabase as any)
      .from("v_mensagens_por_chat")
      .select(select)
      .range((i + 1) * PAGE_SIZE, (i + 2) * PAGE_SIZE - 1),
  );

  const remaining = await Promise.all(remainingFetches);
  const allRows = [
    ...firstPage,
    ...remaining.flatMap((r) => r.data || []),
  ];
  return allRows as unknown as Record<string, unknown>[];
}

async function handleLeadsKanban(session: Awaited<ReturnType<typeof requireSession>>) {
  const { supabase, user, canViewAllLeads } = session;
  const t0 = Date.now();
  const columns = await getPipelineColumns(session, "leads");
  const firstColumnKey = getFirstPipelineColumnKey(columns);
  const negotiatingColumnKey = getNegotiatingColumnKey(columns);
  const [
    { data: contatos, error: contatosError },
    { data: statusRecords, error: statusError },
    { data: conversations, error: conversationsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase
      .from("Contatos_Whatsapp")
      .select("id, nome, Telefone_Whatsapp, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_status")
      .select("telefone, status, updated_at, assigned_to, veiculo_interesse"),
    supabase
      .from("conversations")
      .select("telefone, ultima_mensagem_at")
      .not("ultima_mensagem_at", "is", null),
    supabase.from("profiles").select("id, full_name"),
  ]);

  if (contatosError) throw contatosError;
  if (statusError) throw statusError;
  if (conversationsError) throw conversationsError;
  if (profilesError) throw profilesError;

  console.log(
    `[leads-kanban] total=${Date.now() - t0}ms | contatos=${contatos?.length || 0} | status=${statusRecords?.length || 0} | conversations=${conversations?.length || 0} | profiles=${profiles?.length || 0}`,
  );

  const telefonesComMensagem = new Set(
    (conversations || [])
      .map((conversation) => normalizeLeadPhone(conversation.telefone))
      .filter(Boolean),
  );
  const statusMap = new Map(
    (statusRecords || [])
      .map((statusRecord) => {
        const normalizedPhone = normalizeLeadPhone(statusRecord.telefone);
        if (!normalizedPhone) return null;
        return [normalizedPhone, statusRecord] as const;
      })
      .filter((entry): entry is readonly [string, NonNullable<typeof statusRecords>[number]] => Boolean(entry)),
  );
  const lastInteractionMap = new Map(
    (conversations || [])
      .map((conversation) => {
        const normalizedPhone = normalizeLeadPhone(conversation.telefone);
        if (!normalizedPhone) return null;
        return [normalizedPhone, conversation.ultima_mensagem_at] as const;
      })
      .filter((entry): entry is readonly [string, string | null] => Boolean(entry)),
  );
  const profilesMap = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));

  const leads = (contatos || [])
    .filter((contato) => {
      const hasName = contato.nome && contato.nome.trim() !== "";
      const hasPhone = contato.Telefone_Whatsapp && contato.Telefone_Whatsapp.trim() !== "";
      return hasName || hasPhone;
    })
    .map((contato) => {
      const telefone = contato.Telefone_Whatsapp;
      const normalizedPhone = normalizeLeadPhone(telefone);
      const statusRecord = statusMap.get(normalizedPhone);
      const manualStatus = statusRecord?.status as LeadStatus | undefined;
      const assignedTo = statusRecord?.assigned_to || null;
      const hasMessage = normalizedPhone ? telefonesComMensagem.has(normalizedPhone) : false;

      let status: LeadStatus;
      if (manualStatus && columns.some((column) => column.key === manualStatus)) {
        // Status manual sempre tem prioridade sobre inferência por mensagens
        status = manualStatus;
      } else if (hasMessage) {
        status = negotiatingColumnKey;
      } else {
        status = firstColumnKey;
      }

      return {
        id: contato.id,
        nome: contato.nome,
        telefone,
        created_at: contato.created_at,
        status,
        iaRespondeu: hasMessage,
        assigned_to: assignedTo,
        assignedUserName: assignedTo ? profilesMap.get(assignedTo) : null,
        channel: "whatsapp",
        leadType: statusRecord?.veiculo_interesse || "Lead",
        lastInteractionAt:
          lastInteractionMap.get(normalizedPhone) || statusRecord?.updated_at || contato.created_at,
      };
    });

  if (!canViewAllLeads) {
    return {
      columns,
      leads: leads.filter((lead) => lead.assigned_to === user.id || lead.assigned_to === null),
    };
  }

  return {
    columns,
    leads,
  };
}

async function getDashboard(supabase: SupabaseRouteClient) {
  const t0 = Date.now();
  const [
    { data: contatos },
    { data: conversations },
    { data: statusRecords },
    { data: vehicles },
    { data: vendas },
    { data: margens },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("Contatos_Whatsapp").select("id, Telefone_Whatsapp, created_at, nome"),
    supabase.from("conversations").select("telefone"),
    supabase.from("lead_status").select("telefone, status, updated_at"),
    supabase.from("estoque_carros").select("vehicle_id, created_at, status, title").eq("active", true),
    supabase.from("vendas").select("vehicle_id, preco_venda, data_venda, vendedor_id"),
    supabase.from("margens_veiculos").select("custo_veiculo, despesas, vehicle_id"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const telefonesComMensagem = new Set(
    (conversations || [])
      .map((conversation) => normalizeLeadPhone(conversation.telefone))
      .filter(Boolean),
  );
  const statusMap = new Map(
    (statusRecords || [])
      .map((status) => {
        const normalizedPhone = normalizeLeadPhone(status.telefone);
        if (!normalizedPhone) return null;
        return [normalizedPhone, status] as const;
      })
      .filter((entry): entry is readonly [string, NonNullable<typeof statusRecords>[number]] => Boolean(entry)),
  );
  const margensMap = new Map((margens || []).map((item) => [item.vehicle_id, item]));
  let novosLeads = 0;
  let negociando = 0;
  let vendidos = 0;
  let perdidos = 0;
  const stalledLeads: { nome: string; telefone: string; dias: number }[] = [];

  contatos?.forEach((contato) => {
    const telefone = contato.Telefone_Whatsapp || "";
    const normalizedPhone = normalizeLeadPhone(telefone);
    const statusRecord = normalizedPhone ? statusMap.get(normalizedPhone) : undefined;
    const manualStatus = statusRecord?.status;
    const hasMessage = normalizedPhone ? telefonesComMensagem.has(normalizedPhone) : false;
    let status: string;

    if (manualStatus === "vendido") {
      status = "vendido";
      vendidos++;
    } else if (manualStatus === "perdido") {
      status = "perdido";
      perdidos++;
    } else if (manualStatus === "negociando" || hasMessage) {
      status = "negociando";
      negociando++;
    } else {
      status = "novo_lead";
      novosLeads++;
    }

    if (status === "novo_lead" || status === "negociando") {
      const lastDate = statusRecord?.updated_at || contato.created_at;
      if (lastDate) {
        const dias = differenceInDays(new Date(), new Date(lastDate));
        if (dias >= 7) {
          stalledLeads.push({ nome: contato.nome || "Sem nome", telefone: telefone || "", dias });
        }
      }
    }
  });

  const disponivel = vehicles?.filter((vehicle) => vehicle.status === "disponivel").length || 0;
  const stalledVehiclesList =
    vehicles
      ?.filter((vehicle) => vehicle.status === "disponivel" && vehicle.created_at)
      .map((vehicle) => ({
        title: vehicle.title || "Veículo sem nome",
        dias: differenceInDays(new Date(), new Date(vehicle.created_at!)),
      }))
      .filter((vehicle) => vehicle.dias > 30)
      .sort((a, b) => b.dias - a.dias) || [];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let receitaMes = 0;
  let vendasMes = 0;
  let margemMes = 0;
  const sellerMap: Record<string, { count: number; revenue: number }> = {};

  vendas?.forEach((sale) => {
    if (sale.data_venda) {
      const saleDate = parseISO(sale.data_venda);
      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        receitaMes += sale.preco_venda || 0;
        vendasMes++;
      }
    }

    if (sale.vendedor_id) {
      const current = sellerMap[sale.vendedor_id] || { count: 0, revenue: 0 };
      current.count++;
      current.revenue += sale.preco_venda || 0;
      sellerMap[sale.vendedor_id] = current;
    }
  });

  vendas?.forEach((sale) => {
    if (!sale.data_venda || !sale.vehicle_id) return;
    const saleDate = parseISO(sale.data_venda);
    if (saleDate.getMonth() !== currentMonth || saleDate.getFullYear() !== currentYear) return;
    const margin = margensMap.get(sale.vehicle_id);
    if (margin) {
      margemMes += (sale.preco_venda || 0) - (margin.custo_veiculo + margin.despesas);
    }
  });

  console.log(
    `[dashboard] total=${Date.now() - t0}ms | contatos=${contatos?.length || 0} | conversations=${conversations?.length || 0} | status=${statusRecords?.length || 0} | vehicles=${vehicles?.length || 0} | vendas=${vendas?.length || 0} | margens=${margens?.length || 0}`,
  );

  return {
    leadsData: {
      total: contatos?.length || 0,
      novosLeads,
      negociando,
      vendidos,
      perdidos,
      stalledLeads: stalledLeads.slice(0, 5),
    },
    vehiclesData: {
      disponivel,
      total: vehicles?.length || 0,
      stalledVehicles: stalledVehiclesList.length,
      stalledVehiclesList: stalledVehiclesList.slice(0, 5),
    },
    salesData: {
      receitaMes,
      vendasMes,
      totalVendas: vendas?.length || 0,
      sellerMap,
    },
    marginsData: { margemMes },
    profiles: profiles || [],
  };
}

async function getExportData(supabase: SupabaseRouteClient) {
  const [
    { data: contatos, error: contatosError },
    mensagensAgregadas,
    { data: leadStatuses, error: statusError },
    { data: profiles, error: profilesError },
    { data: vehicles, error: vehiclesError },
    { data: margens, error: margensError },
    { data: vendas, error: vendasError },
  ] = await Promise.all([
    supabase.from("Contatos_Whatsapp").select("*"),
    fetchMensagensAgregadas(supabase, "chat_id"),
    supabase.from("lead_status").select("*"),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("estoque_carros").select("*").eq("active", true).order("created_at", { ascending: false }),
    supabase.from("margens_veiculos").select("vehicle_id, custo_veiculo, despesas, observacao"),
    supabase
      .from("vendas")
      .select("*, estoque_carros (title, preco)")
      .order("data_venda", { ascending: false }),
  ]);

  if (contatosError) throw contatosError;
  if (statusError) throw statusError;
  if (profilesError) throw profilesError;
  if (vehiclesError) throw vehiclesError;
  if (margensError) throw margensError;
  if (vendasError) throw vendasError;

  const telefonesComMensagem = new Set(mensagensAgregadas.map((m) => m.chat_id));
  const statusMap = new Map((leadStatuses || []).map((status) => [status.telefone, status]));
  const profilesMap = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));
  const leads = (contatos || []).map((contato) => {
    const telefone = contato.Telefone_Whatsapp;
    const statusRecord = statusMap.get(telefone || "");
    const manualStatus = statusRecord?.status as LeadStatus | undefined;
    const hasMessage = telefonesComMensagem.has(telefone);
    let status: LeadStatus;

    if (manualStatus === "vendido" || manualStatus === "perdido" || manualStatus === "negociando") {
      status = manualStatus;
    } else if (hasMessage) {
      status = "negociando";
    } else {
      status = "novo_lead";
    }

    return {
      nome: contato.nome || "",
      telefone: telefone?.replace("@s.whatsapp.net", "") || "",
      data_criacao: contato.created_at,
      status,
      responsavel: statusRecord?.assigned_to
        ? profilesMap.get(statusRecord.assigned_to) || "Sem responsável"
        : "Sem responsável",
      veiculo_interesse: statusRecord?.veiculo_interesse || "",
      observacao: statusRecord?.observacao || "",
      origem: "",
      data_atualizacao: statusRecord?.updated_at,
      _rawStatus: status,
    };
  });

  const margensMap = new Map((margens || []).map((margin) => [margin.vehicle_id, margin]));
  const margensData = (vehicles || []).map((vehicle) => {
    const margin = margensMap.get(vehicle.vehicle_id);
    const custo = margin?.custo_veiculo ?? 0;
    const despesas = margin?.despesas ?? 0;
    const preco = vehicle.preco ?? 0;
    const margem_rs = preco - (custo + despesas);
    const margem_pct = preco > 0 ? (margem_rs / preco) * 100 : 0;
    return { ...vehicle, custo, despesas, margem_rs, margem_pct, observacao_margem: margin?.observacao ?? "" };
  });

  return {
    leads,
    vehicles: vehicles || [],
    margens: margensData,
    vendas: vendas || [],
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const op = url.searchParams.get("op");
    const session = await requireSession(request);
    const { supabase, user, canViewAllLeads, tenantId } = session;

    switch (op) {
      case "profiles-active": {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("is_active", true);
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "users": {
        if (!session.isAdmin && !session.isManager) {
          return jsonError("Forbidden", 403);
        }
        const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("id, full_name, email, phone, avatar_url, plan_type, is_active, created_at")
              .order("created_at", { ascending: false }),
            supabase.from("user_roles").select("user_id, role"),
          ]);
        if (profilesError) throw profilesError;
        if (rolesError) throw rolesError;
        return NextResponse.json(
          (profiles || []).map((profile) => ({
            ...profile,
            role: (roles || []).find((role) => role.user_id === profile.id)?.role ?? null,
          })),
        );
      }
      case "team-invitations": {
        if (session.planType !== "essencial") {
          return NextResponse.json([]);
        }
        const { data, error } = await supabase
          .from("invitations")
          .select("id, email, tenant_id, role, created_by, status, created_at, accepted_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "team-limit": {
        const { data, error } = await supabase.rpc("validate_tenant_user_limit");
        if (error) throw error;
        return NextResponse.json({
          canInvite: Boolean(data),
          planType: session.planType,
          tenantId: session.tenantId,
        });
      }
      case "pipeline-columns": {
        const pipeline = normalizePipelineKey(url.searchParams.get("pipeline"));
        return NextResponse.json(await getPipelineColumns(session, pipeline));
      }
      case "leads-kanban":
        return NextResponse.json(await handleLeadsKanban(session));
      case "lead": {
        const id = Number(url.searchParams.get("id"));
        const { data, error } = await supabase.from("Contatos_Whatsapp").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return NextResponse.json(data);
      }
      case "lead-status": {
        const telefone = url.searchParams.get("telefone") || "";
        const { data, error } = await supabase.from("lead_status").select("*").eq("telefone", telefone).maybeSingle();
        if (error) throw error;
        return NextResponse.json(data);
      }
      case "prevenda-leads": {
        assertEssencialFeature(session);
        const [columns, { data, error }] = await Promise.all([
          getPipelineColumns(session, "prevenda"),
          supabase
          .from("prevenda_contatos")
          .select("*")
          .order("created_at", { ascending: false }),
        ]);
        if (error) throw error;
        return NextResponse.json({ columns, leads: data || [] });
      }
      case "prevenda-lead": {
        assertEssencialFeature(session);
        const id = Number(url.searchParams.get("id"));
        const { data, error } = await supabase.from("prevenda_contatos").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return NextResponse.json(data);
      }
      case "tasks": {
        const { data, error } = await supabase.from("tarefas").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "notifications": {
        const { error: syncError } = await supabase.rpc("sync_notification_automation");
        if (syncError) throw syncError;
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "margens": {
        assertEssencialFeature(session);
        const [{ data: vehicles, error: vehiclesError }, { data: margens, error: margensError }] =
          await Promise.all([
            supabase
              .from("estoque_carros")
              .select("vehicle_id, title, marca, modelo, ano, preco")
              .eq("active", true)
              .order("created_at", { ascending: false }),
            supabase.from("margens_veiculos").select("vehicle_id, custo_veiculo, despesas, observacao"),
          ]);
        if (vehiclesError) throw vehiclesError;
        if (margensError) throw margensError;
        return NextResponse.json({ vehicles: vehicles || [], margens: margens || [] });
      }
      case "pos-venda-cards": {
        assertEssencialFeature(session);
        const { data, error } = await supabase
          .from("pos_venda_cards")
          .select("*")
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "pos-venda-oportunidades": {
        assertEssencialFeature(session);
        const { data, error } = await supabase
          .from("view_oportunidades_pos_venda")
          .select("*")
          .order("dias_desde_venda", { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "vehicles-active": {
        const { data, error } = await supabase
          .from("estoque_carros")
          .select("vehicle_id, title, marca, modelo, ano, preco, km, combustivel, cor, cambio, codigo, link, acessorios, status, active, created_at, updated_at, sold_at")
          .eq("active", true)
          .in("status", ["disponivel", "negociando"])
          .order("updated_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "vehicle": {
        const id = url.searchParams.get("id") || "";
        const { data, error } = await supabase.from("estoque_carros").select("*").eq("vehicle_id", id).maybeSingle();
        if (error) throw error;
        return NextResponse.json(data);
      }
      case "sales-page": {
        const [
          { data: soldVehicles, error: soldError },
          { data: sales, error: salesError },
          { data: manualSales, error: manualError },
        ] = await Promise.all([
          supabase.from("estoque_carros").select("vehicle_id, title, marca, modelo, ano, preco, status, sold_at").eq("status", "vendido").order("sold_at", { ascending: false }),
          supabase.from("vendas").select("id, vehicle_id, comprador_nome, comprador_telefone, preco_venda, forma_pagamento, valor_entrada, valor_financiamento, data_venda, vendedor_id, observacao, created_at"),
          supabase.from("vendas").select("id, vehicle_id, comprador_nome, comprador_telefone, preco_venda, forma_pagamento, valor_entrada, valor_financiamento, data_venda, vendedor_id, observacao, created_at").is("vehicle_id", null).order("created_at", { ascending: false }),
        ]);
        if (soldError) throw soldError;
        if (salesError) throw salesError;
        if (manualError) throw manualError;
        const canWriteSales = session.isManager || session.role === "vendedor";
        const sanitizedSales = canWriteSales
          ? (sales || [])
          : (sales || []).map(redactSalePII);
        const sanitizedManualSales = canWriteSales
          ? (manualSales || [])
          : (manualSales || []).map(redactSalePII);
        return NextResponse.json({
          soldVehicles: soldVehicles || [],
          sales: sanitizedSales,
          manualSales: sanitizedManualSales,
        });
      }
      case "dashboard":
        return NextResponse.json(await getDashboard(supabase));
      case "export-data":
        return NextResponse.json(await getExportData(supabase));
      case "notification-preferences": {
        const { data, error } = await supabase.from("notification_preferences").select("*").maybeSingle();
        if (error) throw error;
        if (data) return NextResponse.json(data);
        const { data: created, error: createError } = await supabase
          .from("notification_preferences")
          .upsert({ user_id: user.id }, { onConflict: "user_id" })
          .select("*")
          .single();
        if (createError) throw createError;
        return NextResponse.json(created);
      }
      case "whatsapp-conversations": {
        const waClient = getWhatsappDataClient(supabase);
        const tid = tenantId ?? "00000000-0000-0000-0000-000000000001";
        const [
          { data: conversationRows, error: conversationsError },
          { data: statusRecords, error: statusError },
          { data: profiles, error: profilesError },
          { data: contatos, error: contatosError },
          { data: previewMessages, error: previewError },
          { data: recentInboundMessages, error: inboundPreviewError },
        ] = await Promise.all([
          waClient
            .from("conversations")
            .select("id, telefone, lead_id, nao_lidas, responsavel_id, status, ultima_mensagem_at")
            .eq("tenant_id", tid),
          supabase.from("lead_status").select("telefone, status, veiculo_interesse, observacao, assigned_to"),
          supabase.from("profiles").select("id, full_name"),
          supabase.from("Contatos_Whatsapp").select("*"),
          waClient
            .from("messages")
            .select("conversation_id, conteudo, created_at")
            .eq("tenant_id", tid)
            .order("created_at", { ascending: false })
            .limit(1000),
          waClient
            .from("messages")
            .select("conversation_id, sender, created_at")
            .eq("tenant_id", tid)
            .eq("direcao", "inbound")
            .order("created_at", { ascending: false })
            .limit(1000),
        ]);
        if (conversationsError) throw conversationsError;
        if (statusError) throw statusError;
        if (profilesError) throw profilesError;
        if (contatosError) throw contatosError;
        if (previewError) throw previewError;
        if (inboundPreviewError) throw inboundPreviewError;

        const statusMap = new Map(
          (statusRecords || []).map((s) => [normalizeLeadPhone(s.telefone), s]),
        );
        const profilesMap = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));
        const contatosByLeadId = new Map((contatos || []).map((contato) => [contato.id, contato]));
        const contatosMap = new Map<string, (typeof contatos)[number]>();
        for (const contato of (contatos || [])) {
          const normalizedPhone = normalizeLeadPhone(contato.Telefone_Whatsapp);
          if (!normalizedPhone) continue;
          const existing = contatosMap.get(normalizedPhone);
          const nextName = contato.nome?.trim();
          const existingName = existing?.nome?.trim();
          if (!existing || (!existingName && nextName)) {
            contatosMap.set(normalizedPhone, contato);
          }
        }

        // First occurrence per conversation_id is the most recent (already sorted desc)
        const lastMessageMap = new Map<string, { conteudo: string | null; created_at: string }>();
        for (const msg of (previewMessages || [])) {
          if (!lastMessageMap.has(msg.conversation_id)) {
            lastMessageMap.set(msg.conversation_id, { conteudo: msg.conteudo, created_at: msg.created_at });
          }
        }
        const inboundSenderMap = new Map<string, string>();
        for (const msg of (recentInboundMessages || [])) {
          const senderName = msg.sender?.trim();
          if (senderName && !inboundSenderMap.has(msg.conversation_id)) {
            inboundSenderMap.set(msg.conversation_id, senderName);
          }
        }

        const result = (conversationRows || [])
          .map((conversation) => {
            const normalizedPhone = normalizeLeadPhone(conversation.telefone);
            const statusRec = statusMap.get(normalizedPhone);
            const contatoByLeadId = conversation.lead_id ? contatosByLeadId.get(conversation.lead_id) : null;
            const contato = contatoByLeadId || contatosMap.get(normalizedPhone);
            const lastMsg = lastMessageMap.get(conversation.id);
            const resolvedLeadName =
              contato?.nome?.trim() ||
              inboundSenderMap.get(conversation.id) ||
              normalizedPhone;

            return {
              id: conversation.id,
              telefone: conversation.telefone || normalizedPhone,
              lead_id: conversation.lead_id || contato?.id || null,
              lead_nome: resolvedLeadName,
              nao_lidas: conversation.nao_lidas || 0,
              status: conversation.status || "aberta",
              ultima_mensagem_at: lastMsg?.created_at || conversation.ultima_mensagem_at || null,
              ultima_mensagem_preview: lastMsg?.conteudo || null,
              lead_kanban_status: statusRec?.status || "novo_lead",
              veiculo_interesse: statusRec?.veiculo_interesse || null,
              observacao: contato?.["observação"] || null,
              responsavel_id: statusRec?.assigned_to || conversation.responsavel_id || null,
              assigned_user_name:
                (statusRec?.assigned_to ? profilesMap.get(statusRec.assigned_to) : null) ||
                (conversation.responsavel_id ? profilesMap.get(conversation.responsavel_id) || null : null),
            };
          })
          .sort((a, b) => getMessageTimestamp({ created_at: b.ultima_mensagem_at }) - getMessageTimestamp({ created_at: a.ultima_mensagem_at }));

        if (!canViewAllLeads) {
          const scopedResult = result.filter(
            (conversation) => conversation.responsavel_id === user.id || !conversation.responsavel_id,
          );

          if (scopedResult.length === 0 && result.length > 0) {
            return NextResponse.json(result);
          }

          return NextResponse.json(scopedResult);
        }
        return NextResponse.json(result);
      }
      case "whatsapp-messages": {
        const waClient = getWhatsappDataClient(supabase);
        const tid = tenantId ?? "00000000-0000-0000-0000-000000000001";
        const telefone = url.searchParams.get("telefone") || "";
        if (!telefone) return jsonError("telefone obrigatório", 400);

        const { data: conversation, error: convError } = await waClient
          .from("conversations")
          .select("id")
          .eq("telefone", telefone)
          .eq("tenant_id", tid)
          .maybeSingle();
        if (convError) throw convError;

        if (!conversation) return NextResponse.json([]);

        const { data: messages, error: messagesError } = await waClient
          .from("messages")
          .select("id, conversation_id, conteudo, created_at, direcao, enviada_pelo_agente, sender, telefone, tipo, tipo_midia, url_midia")
          .eq("conversation_id", conversation.id)
          .eq("tenant_id", tid)
          .order("created_at", { ascending: true })
          .limit(500);
        if (messagesError) throw messagesError;

        return NextResponse.json(
          (messages || []).map((message) => ({
            id: String(message.id),
            conversation_id: message.conversation_id,
            conteudo: message.conteudo || null,
            created_at: message.created_at || new Date(0).toISOString(),
            enviada_pelo_agente: message.direcao === "outbound" || message.enviada_pelo_agente === true,
            sender: message.direcao === "outbound" ? "vendedor" : "lead",
            telefone: message.telefone || telefone,
            tipo: message.tipo || "text",
            tipo_midia: message.tipo_midia || null,
            url_midia: message.url_midia || null,
          })),
        );
      }
      default:
        return jsonError(`Operação GET inválida: ${op}`, 400);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const op = url.searchParams.get("op");
    const session = await requireSession(request);
    const { supabase, user, canViewAllLeads, canAssignLeads, tenantId } = session;

    switch (op) {
      case "lead": {
        const body = await parseJson<{ nome: string; Telefone_Whatsapp: string }>(request);
        const { error } = await supabase
          .from("Contatos_Whatsapp")
          .insert({ nome: body.nome, Telefone_Whatsapp: body.Telefone_Whatsapp });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pipeline-column": {
        const body = await parseJson<{ pipeline: PipelineKey; title: string }>(request);
        const pipeline = normalizePipelineKey(body.pipeline);
        await assertManagerCanEditPipeline(session, pipeline);

        const existingColumns = await getPipelineColumns(session, pipeline);
        const rawTitle = body.title?.trim();
        if (!rawTitle) {
          return jsonError("Informe um nome para a coluna.", 400);
        }

        const columnKey = ensureUniqueColumnKey(
          slugifyColumnTitle(rawTitle),
          existingColumns.map((column) => column.key),
        );

        const { error } = await supabase.from("pipeline_columns_config").insert({
          tenant_id: tenantId!,
          pipeline_key: pipeline,
          column_key: columnKey,
          title: rawTitle,
          position: existingColumns.length,
          is_default: false,
          is_active: true,
          color: existingColumns.at(-1)?.color || getDefaultPipelineColumns(pipeline).at(-1)?.color || "#3B82F6",
        });
        if (isMissingPipelineColumnsTable(error)) {
          return jsonError(pipelineColumnsMigrationMessage(), 409);
        }
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "prevenda-lead": {
        assertEssencialFeature(session);
        const body = await parseJson<{ nome: string; telefone: string }>(request);
        const prevendaColumns = await getPipelineColumns(session, "prevenda");
        const { error } = await supabase.from("prevenda_contatos").insert({
          nome: body.nome,
          telefone_whatsapp: body.telefone,
          status: getFirstPipelineColumnKey(prevendaColumns),
          assigned_to: canViewAllLeads ? null : user.id,
        });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "team-invitation": {
        const body = await parseJson<{ email: string; role?: AppRole }>(request);
        const email = body.email.trim().toLowerCase();
        const role = body.role || "vendedor";

        if (!email || !email.includes("@")) {
          return jsonError("E-mail inválido.", 400);
        }
        if (session.planType !== "essencial" || !session.isManager || !session.tenantId) {
          return jsonError("Convites estão disponíveis apenas para gestores no plano Essencial.", 403);
        }

        const { data: canInvite, error: limitError } = await supabase.rpc("validate_tenant_user_limit");
        if (limitError) throw limitError;
        if (!canInvite) {
          return jsonError("Limite de usuários do plano atingido.", 409);
        }

        const { data: invitation, error } = await supabase
          .from("invitations")
          .insert({
            email,
            role,
            tenant_id: session.tenantId,
            created_by: user.id,
            status: "pending",
          })
          .select("id, email, role, status, tenant_id, created_at")
          .single();
        if (error) throw error;

        let authInviteSent = false;
        const serviceClient = createSupabaseServiceClient();
        if (serviceClient) {
          const origin = new URL(request.url).origin;
          const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
            data: {
              tenant_id: session.tenantId,
              invited_by: user.id,
              role,
            },
            redirectTo: `${origin}/`,
          });
          if (!inviteError) {
            authInviteSent = true;
          }
        }

        return NextResponse.json({ invitation, authInviteSent });
      }
      case "task": {
        const task = await parseJson<Record<string, unknown>>(request);
        const payload: Database["public"]["Tables"]["tarefas"]["Insert"] = {
          titulo: task.titulo as string,
          descricao: (task.descricao as string) || null,
          status: ((task.status as string) || "a_fazer") as Database["public"]["Enums"]["task_status"],
          prioridade: ((task.prioridade as string) || "media") as Database["public"]["Enums"]["task_priority"],
          responsavel_id: (task.responsavel_id as string) || (canAssignLeads ? null : user.id),
          responsavel_nome: (task.responsavel_nome as string) || null,
          data_vencimento: (task.data_vencimento as string) || null,
          origem: "manual",
        };
        const { error } = await supabase.from("tarefas").insert(payload);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pos-venda-cards": {
        assertEssencialFeature(session);
        const body = await parseJson<{ cards: unknown[] }>(request);
        if (!body.cards.length) return NextResponse.json({ ok: true });
        const { error } = await supabase.from("pos_venda_cards").insert(body.cards as never);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pos-venda-card": {
        assertEssencialFeature(session);
        const body = await parseJson<Record<string, unknown>>(request);
        const { error } = await supabase.from("pos_venda_cards").insert(body as never);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pos-venda-send-message": {
        assertEssencialFeature(session);
        const body = await parseJson<{
          cardId: string;
          vendaId?: string | null;
          telefone: string;
          conteudo: string;
          nomeLead?: string | null;
          veiculo?: string | null;
          smartKind?: string | null;
        }>(request);

        if (!body.cardId || !body.telefone || !body.conteudo) {
          return jsonError("cardId, telefone e conteudo são obrigatórios.", 400);
        }

        const historyEntry = buildPosVendaHistoryEntry(body);
        const { data: cardRow, error: cardError } = await supabase
          .from("pos_venda_cards")
          .select("metadata")
          .eq("id", body.cardId)
          .maybeSingle();
        if (cardError) throw cardError;

        const currentMetadata = isJsonRecord(cardRow?.metadata) ? cardRow.metadata : {};
        let historyCount =
          typeof currentMetadata.historyCount === "number" ? currentMetadata.historyCount + 1 : 1;
        const lastInteractionAt = historyEntry.data;

        if (body.vendaId) {
          const { data: venda, error: vendaError } = await supabase
            .from("vendas")
            .select("historico_saude")
            .eq("id", body.vendaId)
            .maybeSingle();
          if (vendaError) throw vendaError;

          const currentHistory = jsonHistoryEntries(venda?.historico_saude);
          const updatedHistory = [...currentHistory, historyEntry];
          historyCount = updatedHistory.length;

          const { error: updateVendaError } = await supabase
            .from("vendas")
            .update({ historico_saude: updatedHistory })
            .eq("id", body.vendaId);
          if (updateVendaError) throw updateVendaError;
        }

        const { error: updateCardError } = await supabase
          .from("pos_venda_cards")
          .update({
            metadata: {
              ...currentMetadata,
              historyCount,
              lastInteractionAt,
            },
            status_resumo: body.smartKind === "upgrade_365" ? "Oferta enviada hoje" : "Contato enviado hoje",
            status_tone: "verde",
            prazo_label: "Contato realizado",
            prazo_tone: "verde",
          })
          .eq("id", body.cardId);
        if (updateCardError) throw updateCardError;

        const whatsappClient = getWhatsappDataClient(supabase);
        const { error: mockSendError } = await whatsappClient.from("mensagens_whatsapp").insert({
          telefone_id: body.telefone,
          nome_lead: body.nomeLead || null,
          enviado_pelo_vendedor: true,
          mensagem: body.conteudo,
        } as never);
        if (mockSendError) throw mockSendError;

        return NextResponse.json({ ok: true });
      }
      case "manual-sale": {
        const body = await parseJson<Record<string, unknown>>(request);
        const { error } = await supabase.from("vendas").insert({ ...body, vendedor_id: user.id } as never);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "whatsapp-send-message": {
        const waClient = getWhatsappDataClient(supabase);
        const tid = tenantId ?? "00000000-0000-0000-0000-000000000001";
        const body = await parseJson<{ telefone: string; conteudo: string; nomeLead?: string | null }>(request);
        const { telefone, conteudo } = body;
        if (!telefone || !conteudo) return jsonError("telefone e conteudo obrigatórios", 400);

        type WhatsappWebhookCandidate = {
          id: string;
          nome_loja: string | null;
          api_host?: string | null;
          zapi_instance_id: string;
          zapi_token: string;
          zapi_client_token?: string | null;
        };

        const candidateMap = new Map<string, WhatsappWebhookCandidate>();
        const addCandidate = (candidate: WhatsappWebhookCandidate | null) => {
          if (!candidate?.id) return;
          if (!candidate.zapi_instance_id || !candidate.zapi_token) return;
          if (!candidateMap.has(candidate.id)) {
            candidateMap.set(candidate.id, candidate);
          }
        };

        const formatSendError = async (response: Response, label: string) => {
          const rawText = await response.text().catch(() => response.statusText);
          const compactText = rawText.replace(/\s+/g, " ").trim();
          const contentType = response.headers.get("content-type") || "";
          const isHtml = contentType.includes("text/html") || compactText.startsWith("<!DOCTYPE html");
          const normalizedText = compactText.toLowerCase();

          if (isHtml) {
            return `${label}: HTTP ${response.status} - serviço indisponível no provedor`;
          }

          if (normalizedText.includes("client-token")) {
            return `${label}: Client-Token da Z-API não configurado`;
          }

          return `${label}: HTTP ${response.status}${compactText ? ` - ${compactText}` : ""}`;
        };

        const sendWhatsappMessage = async (candidate: WhatsappWebhookCandidate) => {
          const isMegaApiInstance = candidate.zapi_instance_id.startsWith("megacode-");
          const phoneDigits = telefone.replace(/\D/g, "");

          if (isMegaApiInstance) {
            const apiHost = candidate.api_host?.trim();
            if (!apiHost) {
              throw new Error("host da Mega API não configurado");
            }

            return fetch(`https://${apiHost}/rest/sendMessage/${candidate.zapi_instance_id}/text`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${candidate.zapi_token}` },
              body: JSON.stringify({
                messageData: {
                  to: `${phoneDigits}@s.whatsapp.net`,
                  text: conteudo,
                },
              }),
            });
          }

          const zapiClientToken = candidate.zapi_client_token || process.env.ZAPI_CLIENT_TOKEN || "";
          return fetch(
            `https://api.z-api.io/instances/${candidate.zapi_instance_id}/token/${candidate.zapi_token}/send-text`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(zapiClientToken ? { "Client-Token": zapiClientToken } : {}),
              },
              body: JSON.stringify({ phone: phoneDigits, message: conteudo }),
            },
          );
        };

        // Find conversation + webhook config
        const { data: conv } = await waClient
          .from("conversations")
          .select("id, zapi_webhook_id")
          .eq("telefone", telefone)
          .eq("tenant_id", tid)
          .maybeSingle();

        if (conv?.zapi_webhook_id) {
          const { data } = await waClient
            .from("zapi_webhooks")
            .select("id, nome_loja, api_host, zapi_instance_id, zapi_token, zapi_client_token")
            .eq("id", conv.zapi_webhook_id)
            .maybeSingle();
          addCandidate(data);
        }

        const { data: activeWebhooks, error: activeWebhooksError } = await waClient
          .from("zapi_webhooks")
          .select("id, nome_loja, api_host, zapi_instance_id, zapi_token, zapi_client_token")
          .eq("tenant_id", tid)
          .eq("ativo", true)
          .order("created_at", { ascending: true });

        if (activeWebhooksError) throw activeWebhooksError;
        for (const webhook of activeWebhooks || []) {
          addCandidate(webhook);
        }

        const candidates = [...candidateMap.values()];
        if (!candidates.length) return jsonError("Nenhuma instância WhatsApp configurada", 400);

        const attemptErrors: string[] = [];
        let selectedCandidate: WhatsappWebhookCandidate | null = null;

        for (const candidate of candidates) {
          const providerLabel = candidate.zapi_instance_id.startsWith("megacode-") ? "Mega API" : "Z-API";
          const candidateLabel = `${providerLabel}${candidate.nome_loja ? ` (${candidate.nome_loja})` : ""}`;

          try {
            const sendRes = await sendWhatsappMessage(candidate);
            if (sendRes.ok) {
              selectedCandidate = candidate;
              break;
            }
            attemptErrors.push(await formatSendError(sendRes, candidateLabel));
          } catch (error) {
            attemptErrors.push(
              `${candidateLabel}: ${error instanceof Error ? error.message : "falha inesperada ao enviar"}`,
            );
          }
        }

        if (!selectedCandidate) {
          return jsonError(
            `Erro ao enviar mensagem. ${attemptErrors.join(" | ") || "Nenhuma instância aceitou a requisição."}`,
            502,
          );
        }

        // Salvar mensagem enviada na tabela messages
        const agora = new Date().toISOString();
        if (conv?.id) {
          await Promise.all([
            waClient.from("messages").insert({
              conversation_id: conv.id,
              telefone,
              sender: "agente",
              conteudo,
              tipo: "text",
              direcao: "outbound",
              enviada_pelo_agente: true,
              tenant_id: tid,
            }),
            waClient
              .from("conversations")
              .update({
                ultima_mensagem_at: agora,
                ...(selectedCandidate.id !== conv.zapi_webhook_id ? { zapi_webhook_id: selectedCandidate.id } : {}),
              })
              .eq("id", conv.id),
          ]);
        }

        return NextResponse.json({ ok: true });
      }
      case "avatar": {
        const formData = await request.formData();
        const file = formData.get("file");
        const previousAvatarPath = formData.get("previousAvatarPath");

        if (!(file instanceof File)) {
          return jsonError("Arquivo inválido.", 400);
        }

        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const nextPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const buffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(nextPath, buffer, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("profile-avatars").getPublicUrl(nextPath);
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrlData.publicUrl })
          .eq("id", user.id);
        if (updateError) {
          await supabase.storage.from("profile-avatars").remove([nextPath]);
          throw updateError;
        }
        if (typeof previousAvatarPath === "string" && previousAvatarPath) {
          await supabase.storage.from("profile-avatars").remove([previousAvatarPath]);
        }
        return NextResponse.json({ avatar_url: publicUrlData.publicUrl });
      }
      default:
        return jsonError(`Operação POST inválida: ${op}`, 400);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const op = url.searchParams.get("op");
    const session = await requireSession(request);
    const { supabase, user, canViewAllLeads } = session;

    switch (op) {
      case "user-profile": {
        const body = await parseJson<{ id: string; updates: Record<string, unknown> }>(request);
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: body.updates.full_name as string | null,
            phone: body.updates.phone as string | null,
            is_active: body.updates.is_active as boolean | undefined,
          })
          .eq("id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "profile": {
        const body = await parseJson<{ full_name: string | null; phone: string | null }>(request);
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: body.full_name, phone: body.phone })
          .eq("id", user.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "user-role": {
        const body = await parseJson<{ userId: string; newRole: AppRole }>(request);
        await supabase.from("user_roles").delete().eq("user_id", body.userId);
        const { error } = await supabase.from("user_roles").insert({ user_id: body.userId, role: body.newRole });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "user-active": {
        const body = await parseJson<{ id: string; isActive: boolean }>(request);
        const { error } = await supabase.from("profiles").update({ is_active: body.isActive }).eq("id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "lead-status": {
        const body = await parseJson<Record<string, unknown>>(request);
        const telefone = String(body.telefone || "").trim();

        if (!telefone) {
          return jsonError("Telefone do lead não informado.", 400);
        }

        const assignedToValue =
          "assignedTo" in body
            ? body.assignedTo
            : "assigned_to" in body
              ? body.assigned_to
              : undefined;

        const updatePayload: Database["public"]["Tables"]["lead_status"]["Update"] = {
          updated_at: new Date().toISOString(),
        };

        let leadsColumns: PipelineColumn[] | null = null;
        if ("status" in body) {
          leadsColumns = await ensureValidPipelineStatus(session, "leads", String(body.status || ""));
          updatePayload.status = body.status as LeadStatus;
        }
        if (assignedToValue !== undefined) updatePayload.assigned_to = (assignedToValue as string | null) ?? null;
        if ("veiculoInteresse" in body) updatePayload.veiculo_interesse = (body.veiculoInteresse as string) || null;
        if ("observacao" in body) updatePayload.observacao = (body.observacao as string) || null;

        const { data: existingStatus, error: existingStatusError } = await supabase
          .from("lead_status")
          .select("telefone")
          .eq("telefone", telefone)
          .maybeSingle();

        if (existingStatusError) throw existingStatusError;

        if (existingStatus) {
          const { error } = await supabase.from("lead_status").update(updatePayload).eq("telefone", telefone);
          if (error) throw error;
        } else {
          const columns = leadsColumns || await getPipelineColumns(session, "leads");
          const insertPayload: Database["public"]["Tables"]["lead_status"]["Insert"] = {
            telefone,
            status: (body.status as LeadStatus | undefined) ?? getFirstPipelineColumnKey(columns),
            assigned_to:
              assignedToValue !== undefined
                ? ((assignedToValue as string | null) ?? null)
                : !canViewAllLeads && user.id
                  ? user.id
                  : null,
            veiculo_interesse: "veiculoInteresse" in body ? ((body.veiculoInteresse as string) || null) : null,
            observacao: "observacao" in body ? ((body.observacao as string) || null) : null,
            updated_at: new Date().toISOString(),
          };
          const { error } = await supabase.from("lead_status").insert(insertPayload);
          if (error) throw error;
        }

        return NextResponse.json({ ok: true });
      }
      case "pipeline-column": {
        const body = await parseJson<{ pipeline: PipelineKey; action: "rename"; key: string; title: string }>(request);
        const pipeline = normalizePipelineKey(body.pipeline);
        await assertManagerCanEditPipeline(session, pipeline);

        const title = body.title?.trim();
        if (!body.key || !title) {
          return jsonError("Coluna inválida.", 400);
        }

        const { error } = await supabase
          .from("pipeline_columns_config")
          .update({ title })
          .eq("pipeline_key", pipeline)
          .eq("column_key", body.key);
        if (isMissingPipelineColumnsTable(error)) {
          return jsonError(pipelineColumnsMigrationMessage(), 409);
        }
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pipeline-columns-reorder": {
        const body = await parseJson<{ pipeline: PipelineKey; columnKeys: string[] }>(request);
        const pipeline = normalizePipelineKey(body.pipeline);
        await assertManagerCanEditPipeline(session, pipeline);

        const existingColumns = await getPipelineColumns(session, pipeline);
        const currentKeys = existingColumns.map((column) => column.key).sort().join("|");
        const nextKeys = [...(body.columnKeys || [])].sort().join("|");

        if (!body.columnKeys?.length || currentKeys !== nextKeys) {
          return jsonError("Ordem de colunas inválida.", 400);
        }

        const updates = body.columnKeys.map((columnKey, index) =>
          supabase
            .from("pipeline_columns_config")
            .update({ position: index })
            .eq("pipeline_key", pipeline)
            .eq("column_key", columnKey),
        );
        const results = await Promise.all(updates);
        const failed = results.find((result) => result.error);
        if (failed?.error && isMissingPipelineColumnsTable(failed.error)) {
          return jsonError(pipelineColumnsMigrationMessage(), 409);
        }
        if (failed?.error) throw failed.error;
        return NextResponse.json({ ok: true });
      }
      case "lead": {
        const whatsappClient = getWhatsappDataClient(supabase);
        const body = await parseJson<{
          id?: number;
          telefone?: string;
          nome?: string | null;
          observacao?: string | null;
        }>(request);

        if ("nome" in body && body.telefone) {
          const { error } = await whatsappClient
            .from("mensagens_whatsapp")
            .update({ nome_lead: body.nome ?? null })
            .eq("telefone_id", body.telefone);
          if (error) throw error;
        }

        if ("observacao" in body && body.id) {
          const payload: Database["public"]["Tables"]["Contatos_Whatsapp"]["Update"] = {};
          payload["observação"] = body.observacao ?? null;
          const { error } = await supabase.from("Contatos_Whatsapp").update(payload).eq("id", body.id);
          if (error) {
            const message = "message" in error ? String(error.message) : "";
            const isSchemaCacheMiss = message.includes("schema cache") && message.includes("observação");

            if (!isSchemaCacheMiss) {
              throw error;
            }

            const { data: contato, error: contatoError } = await supabase
              .from("Contatos_Whatsapp")
              .select("Telefone_Whatsapp")
              .eq("id", body.id)
              .maybeSingle();
            if (contatoError) throw contatoError;

            const telefone = contato?.Telefone_Whatsapp;
            if (telefone) {
              const { error: statusError } = await supabase.from("lead_status").upsert(
                {
                  telefone,
                  observacao: body.observacao ?? null,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "telefone" },
              );
              if (statusError) throw statusError;
            }
          }
        }

        return NextResponse.json({ ok: true });
      }
      case "prevenda-status": {
        assertEssencialFeature(session);
        const body = await parseJson<{ id: number; status: string }>(request);
        await ensureValidPipelineStatus(session, "prevenda", body.status);
        const { error } = await supabase.from("prevenda_contatos").update({ status: body.status }).eq("id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "prevenda-lead": {
        assertEssencialFeature(session);
        const body = await parseJson<{ id: number; updates: Record<string, unknown> }>(request);
        if (body.updates.status) {
          await ensureValidPipelineStatus(session, "prevenda", String(body.updates.status));
        }
        const updates = {
          ...body.updates,
          assigned_to: user.id || (body.updates.assigned_to as string | null),
        } as Database["public"]["Tables"]["prevenda_contatos"]["Update"];
        const { error } = await supabase
          .from("prevenda_contatos")
          .update(updates)
          .eq("id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "task": {
        const body = await parseJson<{ id: string; updates: Record<string, unknown> }>(request);
        const { error } = await supabase
          .from("tarefas")
          .update(body.updates as Database["public"]["Tables"]["tarefas"]["Update"])
          .eq("id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "notification-read": {
        const body = await parseJson<{ id: string }>(request);
        const { error } = await supabase.rpc("mark_notification_read", { _notification_id: body.id });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "notifications-read-all": {
        const { error } = await supabase.rpc("mark_all_notifications_read");
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "margem": {
        assertEssencialFeature(session);
        const body = await parseJson<Record<string, unknown>>(request);
        const { error } = await supabase.from("margens_veiculos").upsert(body as never, { onConflict: "vehicle_id" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pos-venda-stage": {
        assertEssencialFeature(session);
        const body = await parseJson<{ id: string; etapa: string; ordem: number }>(request);
        const { error } = await supabase
          .from("pos_venda_cards")
          .update({ etapa: body.etapa, ordem: body.ordem })
          .eq("id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "vehicle-observacoes": {
        const body = await parseJson<{ id: string; observacoes: string }>(request);
        const { error } = await supabase
          .from("estoque_carros")
          .update({ observacoes: body.observacoes })
          .eq("vehicle_id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "vehicle-status": {
        const body = await parseJson<{ id: string; status: VehicleStatus }>(request);
        const updateData: { status: VehicleStatus; sold_at?: string | null; active?: boolean } = { status: body.status };
        if (body.status === "vendido") {
          updateData.sold_at = new Date().toISOString();
          updateData.active = false;
        } else if (body.status === "disponivel") {
          updateData.sold_at = null;
          updateData.active = true;
        }
        const { error } = await supabase.from("estoque_carros").update(updateData).eq("vehicle_id", body.id);
        if (error) throw error;
        if (body.status === "vendido") {
          const { error: saleError } = await supabase.from("vendas").upsert(
            {
              vehicle_id: body.id,
              data_venda: new Date().toISOString().split("T")[0],
              vendedor_id: user.id,
            },
            { onConflict: "vehicle_id" },
          );
          if (saleError) throw saleError;
        }
        if (body.status === "disponivel") {
          const { error: deleteError } = await supabase.from("vendas").delete().eq("vehicle_id", body.id);
          if (deleteError) throw deleteError;
        }
        return NextResponse.json({ ok: true });
      }
      case "sale": {
        const body = await parseJson<{ vehicleId: string; data: Record<string, unknown> }>(request);
        const sale = body.data;
        const payload: Database["public"]["Tables"]["vendas"]["Insert"] = {
          vehicle_id: body.vehicleId,
          comprador_nome: (sale.compradorNome as string) || null,
          comprador_telefone: (sale.compradorTelefone as string) || null,
          preco_venda: (sale.precoVenda as number) || null,
          forma_pagamento: ((sale.formaPagamento as string) || null) as Database["public"]["Enums"]["forma_pagamento"] | null,
          valor_entrada: (sale.valorEntrada as number) || null,
          valor_financiamento: (sale.valorFinanciamento as number) || null,
          data_venda: (sale.dataVenda as string) || null,
          vendedor_id: user.id,
        };
        const { error } = await supabase.from("vendas").upsert(payload, { onConflict: "vehicle_id" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "sale-vehicle-status": {
        const body = await parseJson<{ vehicleId: string; status: VehicleStatus }>(request);
        const { error: updateError } = await supabase
          .from("estoque_carros")
          .update({ status: body.status, sold_at: body.status === "vendido" ? new Date().toISOString() : null })
          .eq("vehicle_id", body.vehicleId);
        if (updateError) throw updateError;
        if (body.status !== "vendido") {
          const { error: deleteError } = await supabase.from("vendas").delete().eq("vehicle_id", body.vehicleId);
          if (deleteError) throw deleteError;
        }
        return NextResponse.json({ ok: true });
      }
      case "notification-preferences": {
        const body = await parseJson<Record<string, unknown>>(request);
        const { error } = await supabase
          .from("notification_preferences")
          .upsert({ user_id: user.id, ...body }, { onConflict: "user_id" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      default:
        return jsonError(`Operação PATCH inválida: ${op}`, 400);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const op = url.searchParams.get("op");
    const session = await requireSession(request);
    const { supabase } = session;
    const body = await parseJson<Record<string, unknown>>(request);

    switch (op) {
      case "lead": {
        const id = Number(body.id);
        const telefone = body.telefone as string | null;
        if (telefone) {
          const { error: statusError } = await supabase.from("lead_status").delete().eq("telefone", telefone);
          if (statusError) throw statusError;
        }
        const { error } = await supabase.from("Contatos_Whatsapp").delete().eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "task": {
        const { error } = await supabase.from("tarefas").delete().eq("id", body.id as string);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pipeline-column": {
        const pipeline = normalizePipelineKey(body.pipeline);
        await assertManagerCanEditPipeline(session, pipeline);

        const columnKey = String(body.key || "").trim();
        const destinationKey = String(body.destinationKey || "").trim();
        if (!columnKey || !destinationKey || columnKey === destinationKey) {
          return jsonError("Destino de remanejamento inválido.", 400);
        }

        const columns = await getPipelineColumns(session, pipeline);
        if (!columns.some((column) => column.key === columnKey) || !columns.some((column) => column.key === destinationKey)) {
          return jsonError("Coluna informada não existe para este pipeline.", 400);
        }

        if (pipeline === "leads") {
          const { error: moveError } = await supabase
            .from("lead_status")
            .update({ status: destinationKey, updated_at: new Date().toISOString() })
            .eq("status", columnKey);
          if (moveError) throw moveError;
        } else {
          const { error: moveError } = await supabase
            .from("prevenda_contatos")
            .update({ status: destinationKey, updated_at: new Date().toISOString() })
            .eq("status", columnKey);
          if (moveError) throw moveError;
        }

        const { error } = await supabase
          .from("pipeline_columns_config")
          .delete()
          .eq("pipeline_key", pipeline)
          .eq("column_key", columnKey);
        if (isMissingPipelineColumnsTable(error)) {
          return jsonError(pipelineColumnsMigrationMessage(), 409);
        }
        if (error) throw error;

        const remainingColumns = columns.filter((column) => column.key !== columnKey);
        const reorderResults = await Promise.all(
          remainingColumns.map((column, index) =>
            supabase
              .from("pipeline_columns_config")
              .update({ position: index })
              .eq("pipeline_key", pipeline)
              .eq("column_key", column.key),
          ),
        );
        const failed = reorderResults.find((result) => result.error);
        if (failed?.error && isMissingPipelineColumnsTable(failed.error)) {
          return jsonError(pipelineColumnsMigrationMessage(), 409);
        }
        if (failed?.error) throw failed.error;

        return NextResponse.json({ ok: true });
      }
      default:
        return jsonError(`Operação DELETE inválida: ${op}`, 400);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(error);
  }
}
