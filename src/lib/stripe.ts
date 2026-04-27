import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });

  return stripeClient;
}
