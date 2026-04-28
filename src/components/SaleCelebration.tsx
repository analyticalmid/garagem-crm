import { BadgeCheck, PartyPopper, Sparkles, Star, Trophy } from "lucide-react";

interface SaleCelebrationProps {
  open: boolean;
  leadName?: string | null;
  sellerName?: string | null;
}

const particles = [
  { left: "7%", size: 10, delay: "0ms", duration: "2200ms", color: "#fbbf24", drift: -18 },
  { left: "14%", size: 7, delay: "120ms", duration: "2400ms", color: "#fb7185", drift: 24 },
  { left: "23%", size: 12, delay: "260ms", duration: "2300ms", color: "#60a5fa", drift: -12 },
  { left: "31%", size: 8, delay: "90ms", duration: "2100ms", color: "#22d3ee", drift: 20 },
  { left: "39%", size: 11, delay: "320ms", duration: "2500ms", color: "#34d399", drift: -28 },
  { left: "47%", size: 9, delay: "180ms", duration: "2250ms", color: "#a78bfa", drift: 10 },
  { left: "55%", size: 12, delay: "60ms", duration: "2450ms", color: "#f59e0b", drift: -22 },
  { left: "63%", size: 7, delay: "280ms", duration: "2150ms", color: "#facc15", drift: 26 },
  { left: "71%", size: 10, delay: "140ms", duration: "2350ms", color: "#38bdf8", drift: -14 },
  { left: "79%", size: 8, delay: "360ms", duration: "2200ms", color: "#4ade80", drift: 18 },
  { left: "87%", size: 11, delay: "210ms", duration: "2400ms", color: "#c084fc", drift: -20 },
  { left: "93%", size: 7, delay: "300ms", duration: "2250ms", color: "#f472b6", drift: 14 },
];

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || null;
}

export function SaleCelebration({ open, leadName, sellerName }: SaleCelebrationProps) {
  if (!open) return null;

  const sellerFirstName = firstName(sellerName);
  const leadFirstName = firstName(leadName);

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.06))]" />

      <div className="absolute left-1/2 top-[12%] h-56 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.35),rgba(96,165,250,0.04)_58%,transparent_72%)] blur-3xl celebration-firework-ring" />
      <div className="absolute left-1/2 top-[18%] h-72 w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(13,148,136,0.14),transparent_68%)] blur-3xl" />

      {particles.map((particle, index) => (
        <span
          key={`${particle.left}-${index}`}
          className="celebration-confetti"
          style={{
            left: particle.left,
            width: `${particle.size}px`,
            height: `${particle.size * 1.9}px`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            background: particle.color,
            ["--drift" as string]: particle.drift,
          }}
        />
      ))}

      <div
        className="absolute left-[18%] top-[20%] text-amber-300 celebration-float-spark"
        style={{ animationDelay: "120ms" }}
      >
        <Sparkles className="h-6 w-6" />
      </div>
      <div
        className="absolute right-[20%] top-[18%] text-sky-300 celebration-float-spark"
        style={{ animationDelay: "260ms" }}
      >
        <Star className="h-5 w-5" />
      </div>
      <div
        className="absolute left-[26%] top-[30%] text-emerald-300 celebration-float-spark"
        style={{ animationDelay: "380ms" }}
      >
        <Trophy className="h-5 w-5" />
      </div>

      <div className="absolute left-1/2 top-20 w-full max-w-3xl -translate-x-1/2 px-4">
        <div className="celebration-card overflow-hidden rounded-[34px] border border-white/12 px-7 py-7 text-center shadow-[0_32px_120px_rgba(2,6,23,0.62)] backdrop-blur-2xl sm:px-10 sm:py-8">
          <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.65),transparent)]" />
          <div className="absolute inset-y-8 left-6 w-px bg-[linear-gradient(180deg,transparent,rgba(96,165,250,0.12),transparent)]" />
          <div className="absolute inset-y-8 right-6 w-px bg-[linear-gradient(180deg,transparent,rgba(52,211,153,0.12),transparent)]" />

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_38%),linear-gradient(145deg,rgba(59,130,246,0.92),rgba(14,116,144,0.92))] text-white shadow-[0_20px_60px_rgba(37,99,235,0.38)]">
            <PartyPopper className="h-9 w-9" />
          </div>

          <div className="mt-5 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/16 bg-sky-300/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              Venda concluída
            </div>
          </div>

          <h3 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            {sellerFirstName ? `${sellerFirstName}, fechou mais uma.` : "Negócio fechado."}
          </h3>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            {leadFirstName
              ? `${leadFirstName} acabou de entrar em vendido. O funil virou resultado, e o CRM registrou esse momento com estilo.`
              : "O lead acabou de entrar em vendido. O funil virou resultado, e o CRM registrou esse momento com estilo."}
          </p>

          <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Status</p>
              <p className="mt-2 text-sm font-medium text-emerald-300">Lead marcado como vendido</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Cliente</p>
              <p className="mt-2 text-sm font-medium text-white">{leadName || "Lead da operação"}</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Destaque</p>
              <p className="mt-2 text-sm font-medium text-sky-200">
                {sellerFirstName ? `Excelente trabalho, ${sellerFirstName}.` : "Excelente trabalho da equipe."}
              </p>
            </div>
          </div>

          <div className="mt-6 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.2),transparent)]" />

          <p className="mt-5 text-sm tracking-[0.14em] text-slate-400">
            O próximo movimento já está no radar. Aproveite a energia da venda e continue puxando o pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
