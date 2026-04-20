import { differenceInDays, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import { createSupabaseRouteClient, getBearerToken } from "@/lib/supabase/route";
import { normalizeLeadPhone } from "@/lib/leadPhone";
import type { Database } from "@/integrations/supabase/types";

type SupabaseRouteClient = ReturnType<typeof createSupabaseRouteClient>;
type AppRole = Database["public"]["Enums"]["app_role"];
type LeadStatus = "novo_lead" | "negociando" | "vendido" | "perdido";
type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 1000;

function jsonError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error || "Erro interno.");
  return NextResponse.json({ error: message }, { status });
}

async function requireSession(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createSupabaseRouteClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const role = (roleData?.role ?? null) as AppRole | null;

  return {
    supabase,
    user,
    role,
    canViewAllLeads: role === "admin" || role === "gerente",
    canAssignLeads: role === "admin" || role === "gerente",
    isAdmin: role === "admin",
    isManager: role === "admin" || role === "gerente",
  };
}

async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

async function fetchMensagensAgregadas(supabase: SupabaseRouteClient, select = "chat_id, ia_respondeu") {
  const mensagensAgregadas: Record<string, unknown>[] = [];
  let pageIndex = 0;

  while (true) {
    const { data, error } = await supabase
      .from("v_mensagens_por_chat")
      .select(select)
      .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    const rows = (data || []) as unknown as Record<string, unknown>[];
    mensagensAgregadas.push(...rows);
    if (!data || data.length < PAGE_SIZE) break;

    pageIndex++;
  }

  return mensagensAgregadas;
}

async function handleLeadsKanban(supabase: SupabaseRouteClient, userId: string, canViewAllLeads: boolean) {
  const [
    { data: contatos, error: contatosError },
    mensagensAgregadas,
    { data: statusRecords, error: statusError },
    { data: conversations, error: conversationsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase.from("Contatos_Whatsapp").select("*").order("created_at", { ascending: false }),
    fetchMensagensAgregadas(supabase),
    supabase.from("lead_status").select("*"),
    supabase.from("conversations").select("telefone, ultima_mensagem_at"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  if (contatosError) throw contatosError;
  if (statusError) throw statusError;
  if (conversationsError) throw conversationsError;
  if (profilesError) throw profilesError;

  const telefonesComMensagem = new Set(
    mensagensAgregadas.map((m) => normalizeLeadPhone(m.chat_id as string | null)).filter(Boolean),
  );
  const telefonesComRespostaIA = new Set(
    mensagensAgregadas
      .filter((m) => m.ia_respondeu === true)
      .map((m) => normalizeLeadPhone(m.chat_id as string | null))
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
      const hasMessage = telefonesComMensagem.has(normalizedPhone);
      const iaRespondeu = telefonesComRespostaIA.has(normalizedPhone);

      let status: LeadStatus;
      if (manualStatus === "vendido" || manualStatus === "perdido") {
        status = manualStatus;
      } else if (hasMessage) {
        status = "negociando";
      } else {
        status = manualStatus || "novo_lead";
      }

      return {
        id: contato.id,
        nome: contato.nome,
        telefone,
        created_at: contato.created_at,
        status,
        iaRespondeu,
        assigned_to: assignedTo,
        assignedUserName: assignedTo ? profilesMap.get(assignedTo) : null,
        channel: "whatsapp",
        leadType: statusRecord?.veiculo_interesse || "Lead",
        lastInteractionAt:
          lastInteractionMap.get(normalizedPhone) || statusRecord?.updated_at || contato.created_at,
      };
    });

  if (!canViewAllLeads) {
    return leads.filter((lead) => lead.assigned_to === userId || lead.assigned_to === null);
  }

  return leads;
}

async function getDashboard(supabase: SupabaseRouteClient) {
  const [
    { data: contatos },
    mensagensAgregadas,
    { data: statusRecords },
    { data: vehicles },
    { data: vendas },
    { data: margens },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("Contatos_Whatsapp").select("id, Telefone_Whatsapp, created_at, nome"),
    fetchMensagensAgregadas(supabase, "chat_id"),
    supabase.from("lead_status").select("telefone, status, updated_at"),
    supabase.from("estoque_carros").select("vehicle_id, created_at, status, title").eq("active", true),
    supabase.from("vendas").select("vehicle_id, preco_venda, data_venda, vendedor_id"),
    supabase.from("margens_veiculos").select("custo_veiculo, despesas, vehicle_id"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const telefonesComMensagem = new Set(mensagensAgregadas.map((m) => m.chat_id));
  const statusMap = new Map((statusRecords || []).map((status) => [status.telefone, status]));
  let novosLeads = 0;
  let negociando = 0;
  let vendidos = 0;
  let perdidos = 0;
  const stalledLeads: { nome: string; telefone: string; dias: number }[] = [];

  contatos?.forEach((contato) => {
    const telefone = contato.Telefone_Whatsapp;
    const statusRecord = statusMap.get(telefone || "");
    const manualStatus = statusRecord?.status;
    const hasMessage = telefonesComMensagem.has(telefone);
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
    const margin = margens?.find((item) => item.vehicle_id === sale.vehicle_id);
    if (margin) {
      margemMes += (sale.preco_venda || 0) - (margin.custo_veiculo + margin.despesas);
    }
  });

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
    const { supabase, user, canViewAllLeads } = session;

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
        const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
          await Promise.all([
            supabase.from("profiles").select("*").order("created_at", { ascending: false }),
            supabase.from("user_roles").select("*"),
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
      case "leads-kanban":
        return NextResponse.json(await handleLeadsKanban(supabase, user.id, canViewAllLeads));
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
        const { data, error } = await supabase
          .from("prevenda_contatos")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "prevenda-lead": {
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
        const { data, error } = await supabase
          .from("pos_venda_cards")
          .select("*")
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
      }
      case "vehicles-active": {
        const { data, error } = await supabase
          .from("estoque_carros")
          .select("*")
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
          supabase.from("estoque_carros").select("*").eq("status", "vendido").order("sold_at", { ascending: false }),
          supabase.from("vendas").select("*"),
          supabase.from("vendas").select("*").is("vehicle_id", null).order("created_at", { ascending: false }),
        ]);
        if (soldError) throw soldError;
        if (salesError) throw salesError;
        if (manualError) throw manualError;
        return NextResponse.json({ soldVehicles: soldVehicles || [], sales: sales || [], manualSales: manualSales || [] });
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
    const { supabase, user, canViewAllLeads, canAssignLeads } = session;

    switch (op) {
      case "lead": {
        const body = await parseJson<{ nome: string; Telefone_Whatsapp: string }>(request);
        const { error } = await supabase
          .from("Contatos_Whatsapp")
          .insert({ nome: body.nome, Telefone_Whatsapp: body.Telefone_Whatsapp });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "prevenda-lead": {
        const body = await parseJson<{ nome: string; telefone: string }>(request);
        const { error } = await supabase.from("prevenda_contatos").insert({
          nome: body.nome,
          telefone_whatsapp: body.telefone,
          status: "novo_lead",
          assigned_to: canViewAllLeads ? null : user.id,
        });
        if (error) throw error;
        return NextResponse.json({ ok: true });
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
        const body = await parseJson<{ cards: unknown[] }>(request);
        if (!body.cards.length) return NextResponse.json({ ok: true });
        const { error } = await supabase.from("pos_venda_cards").insert(body.cards as never);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pos-venda-card": {
        const body = await parseJson<Record<string, unknown>>(request);
        const { error } = await supabase.from("pos_venda_cards").insert(body as never);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "manual-sale": {
        const body = await parseJson<Record<string, unknown>>(request);
        const { error } = await supabase.from("vendas").insert({ ...body, vendedor_id: user.id } as never);
        if (error) throw error;
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
        const payload = {
          telefone: body.telefone as string,
          status: body.status as LeadStatus | undefined,
          assigned_to:
            "assignedTo" in body
              ? ((body.assignedTo as string | null) ?? null)
              : !canViewAllLeads && user.id
                ? user.id
                : undefined,
          veiculo_interesse: (body.veiculoInteresse as string) || null,
          observacao: (body.observacao as string) || null,
          updated_at: new Date().toISOString(),
        };
        const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as
          Database["public"]["Tables"]["lead_status"]["Insert"];
        const { error } = await supabase.from("lead_status").upsert(cleanPayload, { onConflict: "telefone" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "lead": {
        const body = await parseJson<{ id: number; nome: string }>(request);
        const { error } = await supabase.from("Contatos_Whatsapp").update({ nome: body.nome }).eq("id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "prevenda-status": {
        const body = await parseJson<{ id: number; status: string }>(request);
        const { error } = await supabase.from("prevenda_contatos").update({ status: body.status }).eq("id", body.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "prevenda-lead": {
        const body = await parseJson<{ id: number; updates: Record<string, unknown> }>(request);
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
        const body = await parseJson<Record<string, unknown>>(request);
        const { error } = await supabase.from("margens_veiculos").upsert(body as never, { onConflict: "vehicle_id" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "pos-venda-stage": {
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
      default:
        return jsonError(`Operação DELETE inválida: ${op}`, 400);
    }
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(error);
  }
}
