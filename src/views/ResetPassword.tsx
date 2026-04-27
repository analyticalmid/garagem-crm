import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        setIsReady(true);
        setIsCheckingSession(false);
        return;
      }

      if (session) {
        setIsReady(true);
        setIsCheckingSession(false);
      }
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!mounted) return;
      setIsReady(Boolean(sessionData.session));
      setIsCheckingSession(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha precisa ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas diferentes",
        description: "Confirme a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Senha atualizada",
        description: "Sua conta foi ativada. Agora você já pode entrar no CRM.",
      });

      navigate("/", { replace: true });
    } catch (error) {
      toast({
        title: "Não foi possível redefinir a senha",
        description: error instanceof Error ? error.message : "Tente abrir o link novamente pelo e-mail.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(180deg, #050914 0%, #071120 46%, #0b1f47 100%)" }}
    >
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[rgba(8,14,28,0.9)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Definir senha</h1>
            <p className="text-sm text-slate-300">Finalize o acesso da sua conta criada após o pagamento.</p>
          </div>
        </div>

        {isCheckingSession ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validando seu link de acesso...
          </div>
        ) : isReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Nova senha
              </Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-2xl border-white/[0.08] bg-white/[0.05] text-white placeholder:text-slate-500"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Confirmar senha
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-2xl border-white/[0.08] bg-white/[0.05] text-white placeholder:text-slate-500"
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-2xl bg-[linear-gradient(135deg,#2563eb,#3b82f6)] text-sm font-semibold text-white"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar senha e entrar
            </Button>
          </form>
        ) : (
          <div className="space-y-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
            <p>Esse link não está mais válido ou já expirou.</p>
            <Button type="button" variant="outline" className="border-white/10 bg-transparent" onClick={() => navigate("/", { replace: true })}>
              Voltar para o login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
