// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

type OportunidadePosVenda = {
  venda_id: string | null;
  nome_cliente: string | null;
  comprador_telefone: string | null;
  veiculo_nome: string | null;
  oportunidade_kind: "checkup_180" | "upgrade_365" | null;
  mensagem_sugerida: string | null;
  historico_saude: Array<Record<string, unknown>> | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const zApiEndpoint = Deno.env.get("Z_API_ENDPOINT") ?? "";
const zApiToken = Deno.env.get("Z_API_TOKEN") ?? "";
const cronSecret = Deno.env.get("AUTO_POS_VENDA_SECRET") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isAuthorized(request: Request) {
  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  const bearer = bearerMatch?.[1]?.trim() || null;
  const headerSecret = request.headers.get("x-cron-secret")?.trim() || null;

  if (!bearer && !headerSecret) {
    return false;
  }

  if (bearer && !bearerMatch) {
    return false;
  }

  return bearer === cronSecret || headerSecret === cronSecret;
}

function alreadySentToday(history: Array<Record<string, unknown>> | null | undefined, kind: string | null) {
  if (!history?.length || !kind) return false;

  const today = new Date().toISOString().slice(0, 10);
  return history.some((entry) => {
    const entryDate = typeof entry.data === "string" ? entry.data.slice(0, 10) : null;
    return entryDate === today && entry.tipo_contato === "auto_pos_venda" && entry.metadata?.smart_kind === kind;
  });
}

async function sendViaZApi(opportunity: OportunidadePosVenda) {
  const payload = {
    phone: opportunity.comprador_telefone,
    message: opportunity.mensagem_sugerida,
    clientName: opportunity.nome_cliente,
    vehicleModel: opportunity.veiculo_nome,
  };

  if (!zApiEndpoint) {
    return {
      ok: true,
      mock: true,
      status: 200,
      response: { message: "Mock Z-API send executed locally.", payload },
    };
  }

  const response = await fetch(zApiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(zApiToken ? { Authorization: `Bearer ${zApiToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();

  return {
    ok: response.ok,
    mock: false,
    status: response.status,
    response: responseBody,
  };
}

Deno.serve(async (request) => {
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("view_oportunidades_pos_venda")
    .select("venda_id, nome_cliente, comprador_telefone, veiculo_nome, oportunidade_kind, mensagem_sugerida, historico_saude");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const oportunidades = (data ?? []) as OportunidadePosVenda[];
  const results: Array<Record<string, unknown>> = [];

  for (const opportunity of oportunidades) {
    if (!opportunity.venda_id || !opportunity.comprador_telefone || !opportunity.oportunidade_kind) {
      results.push({
        venda_id: opportunity.venda_id,
        status: "ignored",
        reason: "Registro sem venda, telefone ou oportunidade válida.",
      });
      continue;
    }

    if (alreadySentToday(opportunity.historico_saude, opportunity.oportunidade_kind)) {
      results.push({
        venda_id: opportunity.venda_id,
        status: "skipped",
        reason: "Contato automático já realizado hoje.",
      });
      continue;
    }

    const delivery = await sendViaZApi(opportunity);
    const observacao = delivery.ok
      ? `Mensagem automática enviada para ${opportunity.nome_cliente ?? "cliente"} sobre ${opportunity.veiculo_nome ?? "veículo"}.`
      : `Falha no envio automático para ${opportunity.nome_cliente ?? "cliente"}: ${String(delivery.response)}`;

    const { error: historyError } = await supabase.rpc("append_historico_saude_venda", {
      _venda_id: opportunity.venda_id,
      _tipo_contato: "auto_pos_venda",
      _observacao: observacao,
      _canal: "z-api",
      _status: delivery.ok ? "enviado" : "erro",
      _metadata: {
        smart_kind: opportunity.oportunidade_kind,
        provider: delivery.mock ? "mock" : "z-api",
        response_status: delivery.status,
        raw_response: delivery.response,
      },
    });

    if (historyError) {
      results.push({
        venda_id: opportunity.venda_id,
        status: "error",
        reason: historyError.message,
      });
      continue;
    }

    const sourceKey = `sale:${opportunity.venda_id}:${opportunity.oportunidade_kind}`;
    await supabase
      .from("pos_venda_cards")
      .update({
        status_resumo: delivery.ok ? "Automação enviada" : "Falha no disparo",
        status_tone: delivery.ok ? "verde" : "vermelho",
        prazo_label: delivery.ok ? "Enviado hoje" : "Falha no envio",
        prazo_tone: delivery.ok ? "verde" : "vermelho",
      })
      .eq("source_key", sourceKey);

    results.push({
      venda_id: opportunity.venda_id,
      status: delivery.ok ? "sent" : "failed",
      provider: delivery.mock ? "mock" : "z-api",
      response_status: delivery.status,
    });
  }

  return new Response(
    JSON.stringify({
      processed_at: new Date().toISOString(),
      total: oportunidades.length,
      results,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
