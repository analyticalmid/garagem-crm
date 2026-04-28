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
  senderPhoto?: string;
  isGroup?: boolean;
  type: string;
  text?: ZApiTextMessage;
  image?: ZApiImageMessage;
  audio?: ZApiAudioMessage;
  document?: ZApiDocumentMessage;
  timestamp?: number;
}

interface ZApiWebhookPayload {
  instanceId?: string;
  type?: string;
  phone?: string;
  message?: ZApiMessage;
  // on-message-received payload
  zapiMessageId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePhone(raw: string): string {
  // Remove qualquer coisa que não seja dígito, deixa só números
  return raw.replace(/\D/g, "");
}

function extractContent(msg: ZApiMessage): { texto: string | null; tipoMidia: string | null; urlMidia: string | null } {
  if (msg.text) return { texto: msg.text.message ?? null, tipoMidia: null, urlMidia: null };
  if (msg.image) return { texto: msg.image.caption ?? null, tipoMidia: "image", urlMidia: msg.image.imageUrl ?? null };
  if (msg.audio) return { texto: null, tipoMidia: "audio", urlMidia: msg.audio.audioUrl ?? null };
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
  // Apenas POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse payload
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

  // Aceita apenas mensagens recebidas (não enviadas por nós)
  const isReceivedMessage =
    payload.type === "ReceivedCallback" ||
    payload.type === "on-message-received";

  if (!isReceivedMessage) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const msg = payload.message;
  if (!msg) {
    log("warn", "missing_message_object");
    return new Response(JSON.stringify({ error: "No message object" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ignorar mensagens enviadas pelo próprio agente
  if (msg.fromMe) {
    return new Response(JSON.stringify({ ok: true, skipped: "fromMe" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ignorar grupos
  if (msg.isGroup) {
    return new Response(JSON.stringify({ ok: true, skipped: "group" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const instanceId = payload.instanceId ?? "";
  const telefone = normalizePhone(msg.phone ?? payload.phone ?? "");

  if (!telefone) {
    log("warn", "missing_phone");
    return new Response(JSON.stringify({ error: "Missing phone" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cliente com service_role — bypassa RLS para o webhook poder escrever
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // -------------------------------------------------------------------------
  // 1. Identificar a loja pelo instanceId
  // -------------------------------------------------------------------------
  const { data: loja, error: lojaErr } = await supabase
    .from("lojas")
    .select("id, tenant_id, nome_loja")
    .eq("zapi_instance_id", instanceId)
    .eq("ativo", true)
    .maybeSingle();

  if (lojaErr) {
    log("error", "loja_lookup_failed", { instanceId, error: lojaErr.message });
    return new Response(JSON.stringify({ error: "Loja lookup failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!loja) {
    log("warn", "loja_not_found", { instanceId });
    // Retorna 200 para a Z-API não ficar re-tentando com instâncias desconhecidas
    return new Response(JSON.stringify({ ok: true, skipped: "unknown_instance" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id: lojaId, tenant_id: tenantId } = loja;
  const nomeContato = msg.senderName ?? telefone;
  const zapiMsgId = msg.messageId ?? payload.zapiMessageId ?? null;
  const { texto, tipoMidia, urlMidia } = extractContent(msg);
  const agora = new Date().toISOString();

  log("info", "processing_message", { telefone, lojaId, tenantId, tipoMidia: tipoMidia ?? "text" });

  // -------------------------------------------------------------------------
  // 2. Upsert contato em Contatos_Whatsapp
  // -------------------------------------------------------------------------
  const { data: contato, error: contatoErr } = await supabase
    .from("Contatos_Whatsapp")
    .upsert(
      { nome: nomeContato, "Telefone_Whatsapp": telefone, tenant_id: tenantId },
      { onConflict: "Telefone_Whatsapp", ignoreDuplicates: false },
    )
    .select("id")
    .maybeSingle();

  if (contatoErr) {
    log("error", "contato_upsert_failed", { telefone, error: contatoErr.message });
    // Não aborta — tenta buscar o existente
  }

  // Se upsert não retornou, busca pelo telefone
  let contatoId: number | null = contato?.id ?? null;
  if (!contatoId) {
    const { data: existing } = await supabase
      .from("Contatos_Whatsapp")
      .select("id")
      .eq("Telefone_Whatsapp", telefone)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    contatoId = existing?.id ?? null;
  }

  // -------------------------------------------------------------------------
  // 3. Upsert conversa (uma conversa por telefone dentro do tenant)
  // -------------------------------------------------------------------------
  const { data: conversa, error: conversaErr } = await supabase
    .from("conversations")
    .upsert(
      {
        telefone,
        loja_id: lojaId,
        tenant_id: tenantId,
        lead_id: contatoId,
        status: "aberta",
        ultima_mensagem_at: agora,
      },
      { onConflict: "telefone", ignoreDuplicates: false },
    )
    .select("id, nao_lidas")
    .maybeSingle();

  if (conversaErr || !conversa) {
    log("error", "conversa_upsert_failed", { telefone, error: conversaErr?.message });
    return new Response(JSON.stringify({ error: "Conversation upsert failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Incrementa contador de não lidas
  await supabase
    .from("conversations")
    .update({
      nao_lidas: (conversa.nao_lidas ?? 0) + 1,
      ultima_mensagem_at: agora,
      status: "aberta",
    })
    .eq("id", conversa.id);

  // -------------------------------------------------------------------------
  // 4. Inserir mensagem (idempotente via zapi_msg_id)
  // -------------------------------------------------------------------------
  const { error: msgErr } = await supabase
    .from("messages")
    .upsert(
      {
        conversation_id: conversa.id,
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
    // Não aborta — mensagem duplicada ou erro não crítico
  }

  // -------------------------------------------------------------------------
  // 5. Upsert lead_status no Kanban
  //    - Se não existe: cria como 'novo_lead'
  //    - Se existe como 'perdido': volta para 'novo_lead' (reengajamento)
  //    - Sempre atualiza ultimo_contato_em
  // -------------------------------------------------------------------------
  const { data: leadAtual } = await supabase
    .from("lead_status")
    .select("status")
    .eq("telefone", telefone)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const statusAtual = leadAtual?.status ?? null;
  const novoStatus = statusAtual === null || statusAtual === "perdido"
    ? "novo_lead"
    : statusAtual; // mantém 'negociando' ou 'vendido' intactos

  const { error: leadErr } = await supabase
    .from("lead_status")
    .upsert(
      {
        telefone,
        status: novoStatus,
        tenant_id: tenantId,
        ultimo_contato_em: agora,
        // Não sobrescreve assigned_to ou observacao existentes
      },
      { onConflict: "telefone", ignoreDuplicates: false },
    );

  if (leadErr) {
    log("error", "lead_status_upsert_failed", { telefone, error: leadErr.message });
  }

  log("info", "webhook_processed", {
    telefone,
    conversaId: conversa.id,
    leadStatus: novoStatus,
    tipoMidia: tipoMidia ?? "text",
  });

  return new Response(
    JSON.stringify({
      ok: true,
      conversa_id: conversa.id,
      lead_status: novoStatus,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
