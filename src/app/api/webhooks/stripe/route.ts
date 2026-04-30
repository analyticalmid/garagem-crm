import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/route";
import { billingPlans } from "@/lib/billingPlans";
import { getStripeClient } from "@/lib/stripe";
import type { Database, Json } from "@/integrations/supabase/types";
import { slugifyColumnTitle } from "@/lib/kanbanColumns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SHARED_TENANT_ID = "00000000-0000-0000-0000-000000000001";

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }
  return secret;
}

function getAppOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

function buildTenantName(name: string | null, email: string) {
  const fallback = email.split("@")[0]?.trim() || "Cliente";
  const base = (name || fallback).trim();
  return `${base} - Garagem CRM`;
}

function paymentIntentId(value: Stripe.Checkout.Session["payment_intent"]) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function normalizePlan(value: string | null | undefined): Database["public"]["Enums"]["plan_type"] | null {
  if (value === "pro" || value === "essencial") return value;
  return null;
}

async function resolvePlan(session: Stripe.Checkout.Session) {
  const stripe = getStripeClient();
  const metadataPlan = normalizePlan(session.metadata?.plan_type);
  if (metadataPlan) {
    return {
      planType: metadataPlan,
      paymentLinkId: typeof session.payment_link === "string" ? session.payment_link : null,
      paymentLinkUrl: null as string | null,
    };
  }

  const configuredProLinkId = process.env.STRIPE_PRO_PAYMENT_LINK_ID || billingPlans.pro.paymentLinkId;
  const configuredProLinkUrl = process.env.STRIPE_PRO_PAYMENT_LINK_URL || billingPlans.pro.paymentLinkUrl;
  const configuredEssencialLinkId = process.env.STRIPE_ESSENCIAL_PAYMENT_LINK_ID || billingPlans.essencial.paymentLinkId;
  const configuredEssencialLinkUrl = process.env.STRIPE_ESSENCIAL_PAYMENT_LINK_URL || billingPlans.essencial.paymentLinkUrl;
  const paymentLinkId = typeof session.payment_link === "string" ? session.payment_link : null;

  if (paymentLinkId) {
    if (paymentLinkId === configuredProLinkId) {
      return { planType: "pro" as const, paymentLinkId, paymentLinkUrl: null };
    }

    if (paymentLinkId === configuredEssencialLinkId) {
      return { planType: "essencial" as const, paymentLinkId, paymentLinkUrl: null };
    }

    const paymentLink = await stripe.paymentLinks.retrieve(paymentLinkId);
    if (paymentLink.url === configuredProLinkUrl) {
      return { planType: "pro" as const, paymentLinkId, paymentLinkUrl: paymentLink.url };
    }

    if (paymentLink.url === configuredEssencialLinkUrl) {
      return { planType: "essencial" as const, paymentLinkId, paymentLinkUrl: paymentLink.url };
    }
  }

  return null;
}

async function findProfileByEmail(serviceClient: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, email: string) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id, email, full_name, phone, tenant_id, plan_type, is_active")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createTenant(serviceClient: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, name: string) {
  const slug = `${slugifyColumnTitle(name) || "tenant"}_${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await serviceClient
    .from("tenants")
    .insert({ name, slug })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

async function ensureUserForCheckout(params: {
  serviceClient: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
  email: string;
  name: string | null;
  phone: string | null;
  planType: Database["public"]["Enums"]["plan_type"];
  session: Stripe.Checkout.Session;
}) {
  const { serviceClient, email, name, phone, planType, session } = params;
  const existingProfile = await findProfileByEmail(serviceClient, email);

  let userId = existingProfile?.id ?? null;

  if (!userId) {
    const { data: createdUser, error: createUserError } = await serviceClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        phone,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      },
    });

    if (createUserError) throw createUserError;
    userId = createdUser.user.id;
  }

  const refreshedProfile = userId
    ? await (async () => {
        const { data, error } = await serviceClient
          .from("profiles")
          .select("id, tenant_id")
          .eq("id", userId)
          .single();

        if (error) throw error;
        return data;
      })()
    : null;

  if (!userId || !refreshedProfile) {
    throw new Error("Não foi possível preparar o usuário após o pagamento.");
  }

  const shouldCreateDedicatedTenant =
    !refreshedProfile.tenant_id || refreshedProfile.tenant_id === DEFAULT_SHARED_TENANT_ID;

  const tenant = shouldCreateDedicatedTenant
    ? await createTenant(serviceClient, buildTenantName(name, email))
    : { id: refreshedProfile.tenant_id, name: null };

  const { error: profileUpdateError } = await serviceClient
    .from("profiles")
    .update({
      full_name: name,
      email,
      phone,
      plan_type: planType,
      tenant_id: tenant.id,
      is_active: true,
    })
    .eq("id", userId);

  if (profileUpdateError) throw profileUpdateError;

  const { error: roleDeleteError } = await serviceClient.from("user_roles").delete().eq("user_id", userId);
  if (roleDeleteError) throw roleDeleteError;

  const { error: roleInsertError } = await serviceClient.from("user_roles").insert({
    user_id: userId,
    role: "admin",
    tenant_id: tenant.id,
  });
  if (roleInsertError) throw roleInsertError;

  return { userId, tenantId: tenant.id };
}

function jsonFromStripeSession(session: Stripe.Checkout.Session, paymentLinkUrl: string | null): Json {
  return {
    amount_total: session.amount_total ?? null,
    currency: session.currency ?? null,
    livemode: session.livemode,
    mode: session.mode,
    payment_link: typeof session.payment_link === "string" ? session.payment_link : null,
    payment_link_url: paymentLinkUrl,
    payment_status: session.payment_status,
    customer_details: session.customer_details
      ? {
          email: session.customer_details.email ?? null,
          name: session.customer_details.name ?? null,
          phone: session.customer_details.phone ?? null,
        }
      : null,
  };
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    const serviceClient = createSupabaseServiceClient();
    if (!serviceClient) {
      return NextResponse.json({ error: "Missing Supabase service role configuration." }, { status: 500 });
    }

    const body = await request.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid signature";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, ignored: "session_not_paid" });
    }

    const plan = await resolvePlan(session);
    if (!plan) {
      return NextResponse.json({ received: true, ignored: "unmapped_payment_link" });
    }

    const customerEmail = session.customer_details?.email?.trim().toLowerCase();
    if (!customerEmail) {
      return NextResponse.json({ error: "Checkout concluído sem e-mail do cliente." }, { status: 400 });
    }

    const existingCheckout = await (async () => {
      const { data, error } = await serviceClient
        .from("billing_checkouts")
        .select("id, user_id, tenant_id, password_email_sent_at")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    })();

    if (existingCheckout?.password_email_sent_at) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const customerName = session.customer_details?.name?.trim() || null;
    const customerPhone = session.customer_details?.phone?.trim() || null;

    const { userId, tenantId } = await ensureUserForCheckout({
      serviceClient,
      email: customerEmail,
      name: customerName,
      phone: customerPhone,
      planType: plan.planType,
      session,
    });

    const redirectTo = `${getAppOrigin(request)}${process.env.SUPABASE_PASSWORD_RESET_PATH || "/redefinir-senha"}`;
    const { error: resetError } = await serviceClient.auth.resetPasswordForEmail(customerEmail, {
      redirectTo,
    });
    if (resetError) throw resetError;

    const payload = {
      stripe_event_id: event.id,
      stripe_session_id: session.id,
      stripe_payment_link_id: plan.paymentLinkId,
      stripe_payment_link_url: plan.paymentLinkUrl,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      stripe_payment_intent_id: paymentIntentId(session.payment_intent),
      payment_status: session.payment_status,
      plan_type: plan.planType,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      tenant_id: tenantId,
      user_id: userId,
      password_email_sent_at: new Date().toISOString(),
      metadata: jsonFromStripeSession(session, plan.paymentLinkUrl),
    } satisfies Database["public"]["Tables"]["billing_checkouts"]["Insert"];

    const { error: upsertError } = await serviceClient
      .from("billing_checkouts")
      .upsert(payload, { onConflict: "stripe_session_id" });

    if (upsertError) throw upsertError;

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected webhook error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
