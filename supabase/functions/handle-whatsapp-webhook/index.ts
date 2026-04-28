// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types — Z-API webhook payload
// ---------------------------------------------------------------------------

interface ZApiTextMessage {
  message: string;
}

interface ZApiImageMessage {
  caption?: string;
  imageUrl?: string;
  mimeType?: string;
}

interface ZApiAudioMessage {
  audioUrl?: string;
  mimeType?: string;
}

interface ZApiDocumentMessage {
  caption?: string;
  documentUrl?: string;
  mimeType?: string;
  fileName?: string;
}

interface ZApiMessage {
  messageId?: string;
  phone: string;
  fromMe: boolean;
  senderName?: string;
  isGroup?: boolean;
  type: string;
  text?: ZApiTextMessage;
  image?: ZApiImageMessage;
  audio?: ZApiAudioMessage;
  document?: ZApiDocumentMessage;
}

interface ZApiWebhookPayload {
  instanceId?: string;
  type?: string;
  phone?: string;
  message?: ZApiMessage;
  zapiMessageId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

function extractContent(msg: ZApiMessage) {
  if (msg.text)     return { texto: msg.text.message ?? null,              tipoMidia: null,       urlMidia: null };
  if (msg.image)    return { texto: msg.image.caption ?? null,             tipoMidia: "image",    urlMidia: msg.image.imageUrl ?? null };
  if (msg.audio)    return { texto: null,                                  tipoMidia: "audio",    urlMidia: msg.audio.audioUrl ?? null };
  if (msg.document) return { texto: msg.document.caption ?? msg.document.fileName ?? null, tipoMidia: "document", urlMidia: msg.document.documentUrl ?? null };
  return { texto: null, tipoMidia: msg.type ?? null, urlMidia: null };
}

function log(level: "info" | "warn" | "error", msg: string, data?: unknown) {
  const line = { level, msg, ts: new Date().toISOString(), ...(data ? { data } : {}) };
  if (level === "error") console.error(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: ZApiWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    log("warn", "invalid_json");
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  log("info", "webhook_received", { type: payload.type, instanceId: payload.instanceId });

  // Aceita apenas mensagens recebidas
  const isReceivedMessage =
    payload.type === "ReceivedCallback" ||
    payload.type === "on-message-received";

  if (!isReceivedMessage) {
    return new Response(JSON.stringify({ ok: true, skipped: "not_message_event" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const msg = payload.message;
  if (!msg) {
    return new Response(JSON.stringify({ error: "No message object" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (msg.fromMe || msg.isGroup) {
    return new Response(JSON.stringify({ ok: true, skipped: msg.fromMe ? "fromMe" : "group" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const instanceId = payload.instanceId ?? "";
  const telefone   = normalizePhone(msg.phone ?? payload.phone ?? "");

  if (!telefone) {
    return new Response(JSON.stringify({ error: "Missing phone" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // -------------------------------------------------------------------------
  // 1. Identificar instância Z-API → tenant
  // -------------------------------------------------------------------------
  const { data: zapiWebhook, error: zapiErr } = await supabase
    .from("zapi_webhooks")
    .select("id, tenant_id")
    .eq("zapi_instance_id", instanceId)
    .eq("ativo", true)
    .maybeSingle();

  if (zapiErr) {
    log("error", "zapi_webhook_lookup_failed", { instanceId, error: zapiErr.message });
    return new Response(JSON.stringify({ error: "zapi_webhooks lookup failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!zapiWebhook) {
    log("warn", "unknown_instance", { instanceId });
    return new Response(JSON.stringify({ ok: true, skipped: "unknown_instance" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id: zapiWebhookId, tenant_id: tenantId } = zapiWebhook;
  const nomeContato = msg.senderName ?? telefone;
  const zapiMsgId   = msg.messageId ?? payload.zapiMessageId ?? null;
  const { texto, tipoMidia, urlMidia } = extractContent(msg);
  const agora = new Date().toISOString();

  log("info", "processing_message", { telefone, zapiWebhookId, tenantId });

  // -------------------------------------------------------------------------
  // 2. Upsert contato em Contatos_Whatsapp
  // -------------------------------------------------------------------------
  let contatoId: number | null = null;

  const { data: contatoUpsert } = await supabase
    .from("Contatos_Whatsapp")
    .upsert(
      { nome: nomeContato, "Telefone_Whatsapp": telefone, tenant_id: tenantId },
      { onConflict: "Telefone_Whatsapp", ignoreDuplicates: false },
    )
    .select("id")
    .maybeSingle();

  if (contatoUpsert?.id) {
    contatoId = contatoUpsert.id;
  } else {
    // fallback: busca direta
    const { data: existing } = await supabase
      .from("Contatos_Whatsapp")
      .select("id")
      .eq("Telefone_Whatsapp", telefone)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    contatoId = existing?.id ?? null;
  }

  // -------------------------------------------------------------------------
  // 3. Upsert conversa — conflito em (telefone, tenant_id)
  // -------------------------------------------------------------------------
  const { data: conversaUpsert, error: conversaErr } = await supabase
    .from("conversations")
    .upsert(
      {
        telefone,
        zapi_webhook_id: zapiWebhookId,
        tenant_id: tenantId,
        lead_id: contatoId,
        status: "aberta",
        ultima_mensagem_at: agora,
        nao_lidas: 1,
      },
      { onConflict: "telefone,tenant_id", ignoreDuplicates: false },
    )
    .select("id, nao_lidas")
    .maybeSingle();

  if (conversaErr) {
    log("error", "conversa_upsert_failed", { telefone, error: conversaErr.message });
    return new Response(JSON.stringify({ error: "Conversation upsert failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Se a conversa já existia (upsert retorna o row existente), incrementa nao_lidas
  if (conversaUpsert) {
    await supabase
      .from("conversations")
      .update({
        nao_lidas: (conversaUpsert.nao_lidas ?? 0) + 1,
        ultima_mensagem_at: agora,
        status: "aberta",
        lead_id: contatoId,
      })
      .eq("id", conversaUpsert.id);
  }

  const conversaId = conversaUpsert?.id;
  if (!conversaId) {
    log("error", "conversa_id_missing", { telefone });
    return new Response(JSON.stringify({ error: "Could not resolve conversation id" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // -------------------------------------------------------------------------
  // 4. Inserir mensagem — idempotente via UNIQUE(zapi_msg_id)
  // -------------------------------------------------------------------------
  const { error: msgErr } = await supabase
    .from("messages")
    .upsert(
      {
        conversation_id: conversaId,
        telefone,
        sender: nomeContato,
        conteudo: texto,
        tipo: tipoMidia ?? "text",
        tipo_midia: tipoMidia,
        url_midia: urlMidia,
        direcao: "inbound",
        enviada_pelo_agente: false,
        zapi_msg_id: zapiMsgId,
        tenant_id: tenantId,
      },
      { onConflict: "zapi_msg_id", ignoreDuplicates: true },
    );

  if (msgErr) {
    log("error", "message_insert_failed", { zapiMsgId, error: msgErr.message });
    // Não aborta — mensagem duplicada não é crítico
  }

  // -------------------------------------------------------------------------
  // 5. Upsert lead_status no Kanban
  // -------------------------------------------------------------------------
  const { data: leadAtual } = await supabase
    .from("lead_status")
    .select("status")
    .eq("telefone", telefone)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const statusAtual = leadAtual?.status ?? null;
  // Reengaja lead perdido; mantém negociando/vendido intactos
  const novoStatus = !statusAtual || statusAtual === "perdido" ? "novo_lead" : statusAtual;

  const { error: leadErr } = await supabase
    .from("lead_status")
    .upsert(
      {
        telefone,
        status: novoStatus,
        tenant_id: tenantId,
        ultimo_contato_em: agora,
      },
      { onConflict: "telefone", ignoreDuplicates: false },
    );

  if (leadErr) {
    log("error", "lead_status_upsert_failed", { telefone, error: leadErr.message });
  }

  log("info", "webhook_processed", { telefone, conversaId, leadStatus: novoStatus });

  return new Response(
    JSON.stringify({ ok: true, conversa_id: conversaId, lead_status: novoStatus }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
