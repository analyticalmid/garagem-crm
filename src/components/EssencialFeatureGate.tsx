import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { UpgradePlanModal } from "@/components/UpgradePlanModal";
import { useAuth } from "@/contexts/AuthContext";

type EssencialFeatureGateProps = {
  children: ReactNode;
  featureName: string;
};

export function EssencialFeatureGate({ children, featureName }: EssencialFeatureGateProps) {
  const { isPro } = useAuth();
  const [open, setOpen] = useState(isPro);

  if (!isPro) return <>{children}</>;

  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="max-w-md rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Plano Essencial</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {featureName} faz parte do plano Essencial.
        </p>
        <Button onClick={() => setOpen(true)} className="mt-5 rounded-2xl border-0 bg-gradient-to-r from-primary to-blue-400">
          Ver beneficios
        </Button>
      </div>
      <UpgradePlanModal open={open} onOpenChange={setOpen} featureName={featureName} />
    </div>
  );
}
