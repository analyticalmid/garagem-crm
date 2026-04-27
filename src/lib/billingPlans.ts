export type BillingPlan = "pro" | "essencial";

type BillingPlanConfig = {
  label: string;
  priceLabel: string;
  description: string;
  paymentLinkUrl: string;
  paymentLinkId: string;
};

export const billingPlans: Record<BillingPlan, BillingPlanConfig> = {
  pro: {
    label: "Plano Pro",
    priceLabel: "R$ 397/mês",
    description: "Organização comercial, estoque e operação central em um único painel.",
    paymentLinkUrl: "https://buy.stripe.com/bJe8wPeIm7LBdn2clE4c800",
    paymentLinkId: "plink_1TQtpmHrPor0mz5dfQ2Sxbum",
  },
  essencial: {
    label: "Plano Essencial",
    priceLabel: "R$ 597/mês",
    description: "Escala de equipe, prospecção, pós-venda e retenção com gestão completa.",
    paymentLinkUrl: "https://buy.stripe.com/14A00jeIm2rh6YEadw4c801",
    paymentLinkId: "plink_1TQtr4HrPor0mz5dfkRARxmQ",
  },
};

export function isBillingPlan(value: string | null | undefined): value is BillingPlan {
  return value === "pro" || value === "essencial";
}
