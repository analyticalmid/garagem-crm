// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Normalized message — formato interno único, independente da API de origem
// ---------------------------------------------------------------------------
interface NormalizedMessage {
  instanceId: string;
  phone:      string;
  fromMe:     boolean;
  isGroup:    boolean;
  senderName: string;
  messageId:  string | null;
  texto:      string | null;
  tipoMidia:  string | null;
  urlMidia:   string | null;
}

// ---------------------------------------------------------------------------
// Detecção e normalização por API
// ---------------------------------------------------------------------------

function isMegaApi(raw: any): boolean {
  // Mega API sempre tem instance_key e key.remoteJid
  return typeof raw.instance_key === "string" && typeof raw.key?.remoteJid === "string";
}

function normalizeMegaApi(raw: any): NormalizedMessage | null {
  if (raw.isGroup === true) return null;

  const fromMe = raw.key?.fromMe === true;

  // Para mensagens enviadas (fromMe), o telefone do contato é o remoteJid
  // Para mensagens recebidas, também é o remoteJid
  const phone = (raw.key?.remoteJid ?? "").replace(/@.*$/, "").replace(/\D/g, "");
  if (!phone) return null;

  const msg = raw.message ?? {};
  const texto =
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    msg.documentMessage?.caption ??
    null;

  const tipoMidia =
    msg.imageMessage    ? "image"    :
    msg.audioMessage    ? "audio"    :
    msg.videoMessage    ? "video"    :
    msg.documentMessage ? "document" :
    msg.stickerMessage  ? "sticker"  : null;

  const urlMidia =
    msg.imageMessage?.url ??
    msg.audioMessage?.url ??
    msg.videoMessage?.url ??
    msg.documentMessage?.url ??
    null;

  return {
    instanceId: raw.instance_key,
    phone,
    fromMe,
    isGroup:    false,
    senderName: raw.pushName ?? phone,
    messageId:  raw.key?.id ?? null,
    texto,
    tipoMidia,
    urlMidia,
  };
}

function normalizeZApi(raw: any): NormalizedMessage | null {
  if (raw.type !== "ReceivedCallback" && raw.type !== "on-message-received") return null;
  if (raw.isGroup === true) return null;

  // Suporta payload flat OU aninhado em raw.message
  const src = (raw.message?.phone) ? { ...raw, ...raw.message } : raw;

  const phone = (src.phone ?? "").replace(/\D/g, "");
  if (!phone) return null;

  const texto =
    src.text?.message ??
    src.image?.caption ??
    src.document?.caption ?? src.document?.fileName ??
    null;

  const tipoMidia =
    src.image    ? "image"    :
    src.audio    ? "audio"    :
    src.document ? "document" : null;

  const urlMidia =
    src.image?.imageUrl ??
    src.audio?.audioUrl ??
    src.document?.documentUrl ??
    null;

  return {
    instanceId: src.instanceId ?? "",
    phone,
    fromMe:     false,
    isGroup:    false,
    senderName: src.senderName ?? src.chatName ?? phone,
    messageId:  src.messageId ?? null,
    texto,
    tipoMidia,
    urlMidia,
  };
}

function parseWebhook(raw: any): NormalizedMessage | null {
  if (isMegaApi(raw)) return normalizeMegaApi(raw);
  return normalizeZApi(raw);
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------
function log(level: "info" | "warn" | "error", msg: string, data?: unknown) {
  const line = { level, msg, ts: new Date().toISOString(), ...(data ? { data } : {}) };
  if (level === "error") console.error(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  let raw: any;
  try {
    raw = await req.json();
  } catch {
    log("warn", "invalid_json");
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  log("info", "webhook_received", {
    api: isMegaApi(raw) ? "megaapi" : "zapi",
    instance: raw.instance_key ?? raw.instanceId,
    type: raw.type ?? raw.messageType,
  });

  const normalized = parseWebhook(raw);

  if (!normalized) {
    return new Response(JSON.stringify({ ok: true, skipped: "not_inbound_message" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const { instanceId, phone, senderName, messageId, texto, tipoMidia, urlMidia } = normalized;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // -------------------------------------------------------------------------
  // 1. Identificar instância → tenant
  // -------------------------------------------------------------------------
  const { data: webhook, error: webhookErr } = await supabase
    .from("zapi_webhooks")
    .select("id, tenant_id")
    .eq("zapi_instance_id", instanceId)
    .eq("ativo", true)
    .maybeSingle();

  if (webhookErr) {
    log("error", "webhook_lookup_failed", { instanceId, error: webhookErr.message });
    return new Response(JSON.stringify({ error: "Lookup failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  if (!webhook) {
    log("warn", "unknown_instance", { instanceId });
    return new Response(JSON.stringify({ ok: true, skipped: "unknown_instance" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const { id: webhookId, tenant_id: tenantId } = webhook;
  const agora = new Date().toISOString();

  log("info", "processing", { phone, webhookId, tenantId });

  // -------------------------------------------------------------------------
  // 2. Upsert contato
  // -------------------------------------------------------------------------
  let contatoId: number | null = null;
  const { data: contatoUpsert } = await supabase
    .from("Contatos_Whatsapp")
    .upsert(
      { nome: senderName, "Telefone_Whatsapp": phone, tenant_id: tenantId },
      { onConflict: "Telefone_Whatsapp", ignoreDuplicates: false },
    )
    .select("id")
    .maybeSingle();

  contatoId = contatoUpsert?.id ?? null;
  if (!contatoId) {
    const { data: ex } = await supabase
      .from("Contatos_Whatsapp")
      .select("id")
      .eq("Telefone_Whatsapp", phone)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    contatoId = ex?.id ?? null;
  }

  // -------------------------------------------------------------------------
  // 3. Upsert conversa
  // -------------------------------------------------------------------------
  const { data: conversa, error: conversaErr } = await supabase
    .from("conversations")
    .upsert(
      { telefone: phone, zapi_webhook_id: webhookId, tenant_id: tenantId, lead_id: contatoId, status: "aberta", ultima_mensagem_at: agora, nao_lidas: 1 },
      { onConflict: "telefone,tenant_id", ignoreDuplicates: false },
    )
    .select("id, nao_lidas")
    .maybeSingle();

  if (conversaErr || !conversa?.id) {
    log("error", "conversa_failed", { phone, error: conversaErr?.message });
    return new Response(JSON.stringify({ error: "Conversation failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("conversations")
    .update({ nao_lidas: (conversa.nao_lidas ?? 0) + 1, ultima_mensagem_at: agora, status: "aberta", lead_id: contatoId })
    .eq("id", conversa.id);

  // -------------------------------------------------------------------------
  // 4. Inserir mensagem
  // -------------------------------------------------------------------------
  const direcao = normalized.fromMe ? "outbound" : "inbound";
  await supabase.from("messages").upsert(
    { conversation_id: conversa.id, telefone: phone, sender: senderName, conteudo: texto, tipo: tipoMidia ?? "text", tipo_midia: tipoMidia, url_midia: urlMidia, direcao, enviada_pelo_agente: normalized.fromMe, zapi_msg_id: messageId, tenant_id: tenantId },
    { onConflict: "zapi_msg_id", ignoreDuplicates: true },
  );

  // -------------------------------------------------------------------------
  // 5. Upsert lead_status no Kanban (apenas para mensagens do cliente)
  // -------------------------------------------------------------------------
  let novoStatus = "novo_lead";
  if (!normalized.fromMe) {
    const { data: leadAtual } = await supabase
      .from("lead_status")
      .select("status")
      .eq("telefone", phone)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    novoStatus = !leadAtual?.status || leadAtual.status === "perdido" ? "novo_lead" : leadAtual.status;

    await supabase.from("lead_status").upsert(
      { telefone: phone, status: novoStatus, tenant_id: tenantId, ultimo_contato_em: agora },
      { onConflict: "telefone", ignoreDuplicates: false },
    );
  }

  log("info", "done", { phone, conversaId: conversa.id, leadStatus: novoStatus });

  return new Response(
    JSON.stringify({ ok: true, conversa_id: conversa.id, lead_status: novoStatus }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
