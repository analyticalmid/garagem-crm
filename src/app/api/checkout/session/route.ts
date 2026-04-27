import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { billingPlans, isBillingPlan, type BillingPlan } from "@/lib/billingPlans";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutLineItem = {
  price: string;
  quantity: number;
};

function getAppOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

async function buildLineItemsFromPaymentLink(stripe: Stripe, plan: BillingPlan) {
  const paymentLinkId =
    plan === "pro"
      ? process.env.STRIPE_PRO_PAYMENT_LINK_ID || billingPlans.pro.paymentLinkId
      : process.env.STRIPE_ESSENCIAL_PAYMENT_LINK_ID || billingPlans.essencial.paymentLinkId;

  const { data } = await stripe.paymentLinks.listLineItems(paymentLinkId, {
    limit: 10,
    expand: ["data.price"],
  });

  if (!data.length) {
    throw new Error(`O Payment Link do plano ${plan} não possui itens configurados.`);
  }

  const lineItems = data
    .map((item) => {
      const priceId = typeof item.price === "string" ? item.price : item.price?.id;
      if (!priceId) return null;

      return {
        price: priceId,
        quantity: item.quantity || 1,
      } satisfies CheckoutLineItem;
    })
    .filter((item): item is CheckoutLineItem => Boolean(item));

  if (!lineItems.length) {
    throw new Error(`Não foi possível montar os itens do checkout para o plano ${plan}.`);
  }

  const hasRecurringItem = data.some((item) => {
    if (typeof item.price === "string") return false;
    return Boolean(item.price?.recurring);
  });

  return {
    lineItems,
    mode: hasRecurringItem ? ("subscription" as const) : ("payment" as const),
  };
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const body = (await request.json()) as { plan?: string };
    const plan = body.plan;

    if (!isBillingPlan(plan)) {
      return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    }

    const { lineItems, mode } = await buildLineItemsFromPaymentLink(stripe, plan);
    const origin = getAppOrigin(request);
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page" as never,
      mode,
      line_items: lineItems,
      metadata: {
        plan_type: plan,
      },
      name_collection: {
        individual: {
          enabled: true,
          optional: false,
        },
      },
      ...(mode === "payment" ? { customer_creation: "always" as const } : {}),
      phone_number_collection: {
        enabled: true,
      },
      billing_address_collection: "auto",
      return_url: `${origin}/checkout/sucesso?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
    });

    if (!session.client_secret) {
      throw new Error("A Stripe não retornou o client secret do checkout.");
    }

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível iniciar o checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
