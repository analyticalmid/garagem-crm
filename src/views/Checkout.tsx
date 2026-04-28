import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { billingPlans, isBillingPlan, type BillingPlan } from "@/lib/billingPlans";

const publicSiteUrl = "https://garagemcrm.com.br";

const stripePromise = (() => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);
})();

async function fetchClientSecret(plan: BillingPlan) {
  const response = await fetch("/api/checkout/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });

  const payload = (await response.json()) as { clientSecret?: string; error?: string };

  if (!response.ok || !payload.clientSecret) {
    throw new Error(payload.error || "Não foi possível preparar o checkout.");
  }

  return payload.clientSecret;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { plan: planParam } = useParams();
  const plan = isBillingPlan(planParam) ? planParam : null;

  const stripeOptions = useMemo(() => {
    if (!plan) return null;
    return {
      fetchClientSecret: () => fetchClientSecret(plan),
    };
  }, [plan]);

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
        <div className="w-full max-w-xl rounded-[28px] border border-red-400/20 bg-red-500/10 p-6">
          <h1 className="text-xl font-semibold">Stripe não configurada</h1>
          <p className="mt-2 text-sm text-red-100/90">
            Defina `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` para habilitar o checkout embutido.
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
        <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-semibold">Plano não encontrado</h1>
          <p className="mt-2 text-sm text-slate-300">Escolha um plano válido para iniciar a compra.</p>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const currentPlan = billingPlans[plan];

  return (
    <div
      className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-10"
      style={{ background: "linear-gradient(180deg, #050914 0%, #071120 46%, #0b1f47 100%)" }}
    >
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-white/10 bg-[rgba(8,14,28,0.86)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <a
            href={publicSiteUrl}
            className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o site
          </a>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Checkout seguro
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{currentPlan.label}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{currentPlan.description}</p>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Investimento</p>
            <p className="mt-2 text-3xl font-semibold">{currentPlan.priceLabel}</p>
            <p className="mt-2 text-sm text-slate-300">Nome, e-mail e telefone são capturados no próprio checkout.</p>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-200">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
              <p>Após o pagamento, o sistema cria seu acesso e envia o e-mail para definir a senha.</p>
            </div>
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
              <p>O pagamento acontece dentro do CRM, sem abrir outra aba.</p>
            </div>
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
              <p>A confirmação continua protegida pelo webhook oficial da Stripe.</p>
            </div>
          </div>
        </aside>

        <section className="rounded-[28px] border border-white/10 bg-white p-2 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
          <div className="min-h-[780px] rounded-[24px] bg-slate-50 p-3">
            {stripeOptions ? (
              <EmbeddedCheckoutProvider stripe={stripePromise} options={stripeOptions}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            ) : (
              <div className="flex min-h-[760px] items-center justify-center text-slate-700">
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Preparando checkout...
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
