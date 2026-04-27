import { ArrowUpRight, Crown, Sparkles, UsersRound, Workflow } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UpgradePlanModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
};

export function UpgradePlanModal({ open, onOpenChange, featureName = "este módulo" }: UpgradePlanModalProps) {
  const handleUpgrade = () => {
    onOpenChange(false);
    window.location.href = "mailto:comercial@garagemcrm.com?subject=Upgrade%20para%20o%20plano%20Essencial";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] overflow-hidden rounded-[26px] border-white/[0.1] bg-[linear-gradient(160deg,rgba(17,23,37,0.98),rgba(8,12,22,0.99)_58%,rgba(4,7,13,0.99))] p-0 text-foreground shadow-[0_28px_90px_rgba(0,0,0,0.56)]">
        <div className="relative">
          <div className="relative h-24 overflow-hidden border-b border-white/[0.07]">
            <img
              src="/f1-car.jpg"
              alt="Ferrari esportiva"
              className="h-full w-full object-cover object-center opacity-[0.85]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,15,0.8),rgba(5,8,15,0.18)_48%,rgba(5,8,15,0.86)),linear-gradient(180deg,rgba(5,8,15,0.05),rgba(5,8,15,0.92))]" />
            <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/35 bg-black/35 text-amber-200 shadow-[0_14px_34px_rgba(251,191,36,0.13)] backdrop-blur-sm">
              <Crown className="h-5 w-5" />
            </div>
            <span className="absolute right-5 top-5 rounded-full border border-emerald-300/25 bg-emerald-300/[0.12] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100 backdrop-blur-sm">
              Essencial
            </span>
          </div>

          <div className="relative p-5">
            <DialogHeader className="space-y-3 text-left">
              <div>
                <DialogTitle className="max-w-sm text-xl font-semibold leading-tight tracking-tight">
                  Desbloqueie {featureName} no plano Essencial
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6 text-slate-300/82">
                  O plano Pro cobre a rotina comercial principal. O Essencial adiciona crescimento, equipe e retenção para uma operação mais completa.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="mt-5 grid gap-2.5">
              <div className="flex gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-200">
                  <Workflow className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Prospecção e Pós-Venda</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Kanbans avançados para compra de veículos, retenção e recompra.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
                  <UsersRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Equipe com até 3 usuários</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Convide vendedores e gestores mantendo todos no mesmo tenant.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Automações de retenção</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Ações sugeridas para check-up, recompra e relacionamento pós-venda.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-2xl border-white/[0.08] bg-white/[0.03] px-4 text-slate-200 hover:bg-white/[0.06]"
              >
                Agora não
              </Button>
              <Button
                onClick={handleUpgrade}
                className="h-11 rounded-2xl border-0 bg-[linear-gradient(135deg,#f8cf68,#f59e0b)] px-5 font-semibold text-slate-950 shadow-[0_18px_38px_rgba(245,158,11,0.24)] hover:brightness-105"
              >
                Fazer upgrade para o plano Essencial
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
