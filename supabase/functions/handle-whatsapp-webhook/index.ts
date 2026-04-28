// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types — Z-API envia payload FLAT (campos na raiz, não dentro de "message")
// ---------------------------------------------------------------------------

interface ZApiTextContent   { message: string }
interface ZApiImageContent  { caption?: string; imageUrl?: string }
interface ZApiAudioContent  { audioUrl?: string }
interface ZApiDocumentContent { caption?: string; documentUrl?: string; fileName?: string }

interface ZApiPayload {
  // identificação da instância
  instanceId?: string;
  // tipo do evento
  type?: string;
  // dados do contato/mensagem — todos na raiz
  phone?: string;
  fromMe?: boolean;
  isGroup?: boolean;
  senderName?: string;
  chatName?: string;
  messageId?: string;
  momment?: number;
  // conteúdo (apenas um desses vem preenchido por mensagem)
  text?: ZApiTextContent;
  image?: ZApiImageContent;
  audio?: ZApiAudioContent;
  document?: ZApiDocumentContent;
  // fallback: alguns eventos ainda encapsulam em "message"
  message?: Partial<ZApiPayload>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

// Normaliza payload: suporta tanto formato flat quanto aninhado em "message"
function normalize(raw: ZApiPayload): ZApiPayload {
  if (raw.message && typeof raw.message === "object" && raw.message.phone) {
    // formato aninhado — eleva os campos para a raiz
    return { ...raw, ...raw.message };
  }
  return raw;
}

function extractContent(p: ZApiPayload) {
  if (p.text)     return { texto: p.text.message ?? null,                              tipoMidia: null,       urlMidia: null };
  if (p.image)    return { texto: p.image.caption ?? null,                             tipoMidia: "image",    urlMidia: p.image.imageUrl ?? null };
  if (p.audio)    return { texto: null,                                                tipoMidia: "audio",    urlMidia: p.audio.audioUrl ?? null };
  if (p.document) return { texto: p.document.caption ?? p.document.fileName ?? null,  tipoMidia: "document", urlMidia: p.document.documentUrl ?? null };
  return { texto: null, tipoMidia: p.type ?? null, urlMidia: null };
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
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  let raw: ZApiPayload;
  try {
    raw = await req.json();
  } catch {
    log("warn", "invalid_json");
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const payload = normalize(raw);

  log("info", "webhook_received", { type: payload.type, instanceId: payload.instanceId, phone: payload.phone });

  // Aceita apenas mensagens recebidas
  const isReceivedMessage =
    payload.type === "ReceivedCallback" ||
    payload.type === "on-message-received";

  if (!isReceivedMessage) {
    return new Response(JSON.stringify({ ok: true, skipped: "not_message_event" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  if (payload.fromMe) {
    return new Response(JSON.stringify({ ok: true, skipped: "fromMe" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  if (payload.isGroup) {
    return new Response(JSON.stringify({ ok: true, skipped: "group" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const instanceId = payload.instanceId ?? "";
  const telefone   = normalizePhone(payload.phone ?? "");

  if (!telefone) {
    log("warn", "missing_phone", { raw_phone: payload.phone });
    return new Response(JSON.stringify({ error: "Missing phone" }), {
      status: 400, headers: { "Content-Type": "application/json" },
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
    log("error", "zapi_lookup_failed", { instanceId, error: zapiErr.message });
    return new Response(JSON.stringify({ error: "zapi_webhooks lookup failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  if (!zapiWebhook) {
    log("warn", "unknown_instance", { instanceId });
    return new Response(JSON.stringify({ ok: true, skipped: "unknown_instance" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const { id: zapiWebhookId, tenant_id: tenantId } = zapiWebhook;
  const nomeContato = payload.senderName ?? payload.chatName ?? telefone;
  const zapiMsgId   = payload.messageId ?? null;
  const { texto, tipoMidia, urlMidia } = extractContent(payload);
  const agora = new Date().toISOString();

  log("info", "processing_message", { telefone, zapiWebhookId, tenantId, tipo: tipoMidia ?? "text" });

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
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const conversaId = conversaUpsert?.id;
  if (!conversaId) {
    log("error", "conversa_id_missing", { telefone });
    return new Response(JSON.stringify({ error: "Could not resolve conversation id" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  // Incrementa nao_lidas na conversa existente
  await supabase
    .from("conversations")
    .update({
      nao_lidas: (conversaUpsert.nao_lidas ?? 0) + 1,
      ultima_mensagem_at: agora,
      status: "aberta",
      lead_id: contatoId,
    })
    .eq("id", conversaId);

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
  const novoStatus = !statusAtual || statusAtual === "perdido" ? "novo_lead" : statusAtual;

  const { error: leadErr } = await supabase
    .from("lead_status")
    .upsert(
      { telefone, status: novoStatus, tenant_id: tenantId, ultimo_contato_em: agora },
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
