import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, MailCheck } from "lucide-react";
import { billingPlans, isBillingPlan } from "@/lib/billingPlans";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan");
  const plan = isBillingPlan(planParam) ? billingPlans[planParam] : null;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8 text-white"
      style={{ background: "linear-gradient(180deg, #050914 0%, #071120 46%, #0b1f47 100%)" }}
    >
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[rgba(8,14,28,0.88)] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200">
          <BadgeCheck className="h-3.5 w-3.5" />
          Pagamento confirmado
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
          {plan ? `${plan.label} ativado` : "Compra concluída com sucesso"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          Seu pagamento foi recebido. Agora o sistema está finalizando a criação do seu acesso no CRM.
        </p>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5">
          <div className="flex items-start gap-3">
            <MailCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
            <div>
              <p className="font-medium text-white">Próximo passo</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Verifique seu e-mail para definir a senha de acesso. Depois disso, você já poderá entrar no sistema normalmente.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className="rounded-full bg-[linear-gradient(135deg,#2563eb,#3b82f6)] px-5 py-3 text-sm font-semibold text-white">
            Ir para o login
          </Link>
          <Link to="/" className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
