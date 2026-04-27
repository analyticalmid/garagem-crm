import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CarFront, ChartNoAxesCombined, ClipboardCheck, Loader2, UserRound } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, user, profile } = useAuth();

  useEffect(() => {
    if (user && profile?.is_active) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, profile?.is_active, user]);

  if (user && profile?.is_active) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate input
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Erro no login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login realizado",
          description: "Bem-vindo ao CRM da Garagem",
        });
        navigate("/dashboard", { replace: true });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-10"
      style={{
        background: "linear-gradient(180deg, #050914 0%, #071120 46%, #0b1f47 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-[-80px] h-[260px] w-[260px] rounded-full bg-[#2f6bff]/16 blur-3xl" />
        <div className="absolute right-[-100px] top-[60px] h-[320px] w-[320px] rounded-full bg-[#5a88ff]/22 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[18%] h-[320px] w-[320px] rounded-full bg-[#7fa5ff]/18 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-2rem)] items-center justify-center">
        <div className="w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(8,14,28,0.88)] shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,0.94fr)_minmax(300px,1.06fr)] xl:min-h-[600px]">
            <div className="flex flex-col justify-between p-5 sm:p-7 lg:p-8">
              <div className="flex items-center justify-between gap-4 text-[13px] font-semibold uppercase tracking-[0.16em] text-white">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo-garagem.svg"
                    alt="Garagem CRM"
                    className="h-11 w-11 rounded-[14px] object-contain object-center shadow-[0_10px_30px_rgba(37,99,235,0.18)]"
                  />
                  <span>Garagem CRM</span>
                </div>
                <div className="hidden items-center gap-5 text-[11px] font-medium normal-case tracking-normal text-slate-400 sm:flex">
                  <span>Operação</span>
                  <span>CRM</span>
                  <span>Equipe</span>
                </div>
              </div>

              <div className="max-w-[365px] py-3 lg:py-0">
                <h1
                  className="mt-1 text-[1.65rem] font-semibold uppercase leading-[0.92] tracking-[-0.05em] text-white sm:text-[2.3rem] xl:text-[2.6rem]"
                  style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}
                >
                  Entre no seu centro de operação
                </h1>

                <p className="mt-4 max-w-[320px] text-[13px] leading-5 text-slate-300 sm:text-[13px]">
                  Acesse um painel mais claro para acompanhar negociações, tarefas e performance comercial com velocidade.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
                  <div>
                    <Label htmlFor="email" className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="mt-1.5 h-10 rounded-2xl border-white/[0.08] bg-white/[0.05] text-white placeholder:text-slate-500"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 h-10 rounded-2xl border-white/[0.08] bg-white/[0.05] text-white placeholder:text-slate-500"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center">
                    <Button
                      type="submit"
                      className="h-10 rounded-full bg-[linear-gradient(135deg,#2563eb,#3b82f6)] px-5 text-sm font-semibold text-white transition-all hover:shadow-[0_18px_40px_rgba(37,99,235,0.26)]"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Entrar
                    </Button>
                  </div>
                </form>
              </div>

              <div />
            </div>

            <div className="relative hidden min-h-full overflow-hidden bg-[linear-gradient(135deg,#1e40af,#2563eb_55%,#3b82f6)] lg:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.08),transparent_26%)]" />

              <div className="absolute -bottom-[34%] -right-[18%] h-[760px] w-[760px] rounded-full border border-white/18 opacity-80 blur-[1px]" />
              <div className="absolute -bottom-[28%] -right-[12%] h-[620px] w-[620px] rounded-full border border-white/16 opacity-70 blur-[1px]" />
              <div className="absolute -bottom-[22%] -right-[6%] h-[500px] w-[500px] rounded-full border border-white/14 opacity-65 blur-[1px]" />
              <div className="absolute -bottom-[16%] right-[0%] h-[380px] w-[380px] rounded-full border border-white/12 opacity-60 blur-[1px]" />
              <div className="absolute bottom-[8%] right-[8%] h-[340px] w-[340px] rounded-full bg-white/10 blur-[70px]" />
              <div className="absolute bottom-[0%] right-[0%] h-[420px] w-[420px] rounded-full bg-[#93c5fd]/12 blur-[110px]" />

              <div className="absolute left-[18%] top-[10%] h-[108px] w-[108px] rounded-[30px] border border-white/20 bg-white/10 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-[18px]" />

              <div className="absolute left-[10%] top-[13%] flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/20 bg-white/10 text-blue-50 shadow-[0_14px_34px_rgba(15,23,42,0.22)] backdrop-blur-[18px]">
                <CarFront className="h-6 w-6" />
              </div>

              <div className="absolute right-[12%] top-[16%] flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/20 bg-white/10 text-blue-50 shadow-[0_14px_34px_rgba(15,23,42,0.22)] backdrop-blur-[18px]">
                <UserRound className="h-6 w-6" />
              </div>

              <div className="absolute left-[14%] bottom-[24%] hidden h-[62px] w-[62px] items-center justify-center rounded-[24px] border border-white/20 bg-white/10 text-blue-50 shadow-[0_14px_34px_rgba(15,23,42,0.22)] backdrop-blur-[18px] xl:flex">
                <ChartNoAxesCombined className="h-6 w-6" />
              </div>

              <div className="absolute right-[16%] bottom-[18%] hidden h-[68px] w-[68px] items-center justify-center rounded-[26px] border border-white/20 bg-white/10 text-blue-50 shadow-[0_14px_34px_rgba(15,23,42,0.22)] backdrop-blur-[18px] xl:flex">
                <ClipboardCheck className="h-6 w-6" />
              </div>

              <div className="absolute left-[28%] top-[22%] h-px w-[52%] bg-gradient-to-r from-transparent via-white/18 to-transparent" />
              <div className="absolute right-[10%] top-[42%] h-px w-[34%] bg-gradient-to-r from-transparent via-white/14 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
