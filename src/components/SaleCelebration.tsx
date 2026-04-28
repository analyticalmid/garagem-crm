import { BadgeCheck } from "lucide-react";

interface SaleCelebrationProps {
  open: boolean;
  leadName?: string | null;
  sellerName?: string | null;
}

const particles = [
  { left: "8%",  size: 8,  delay: "0ms",   duration: "2200ms", color: "#fbbf24", drift: -16 },
  { left: "18%", size: 6,  delay: "140ms",  duration: "2400ms", color: "#fb7185", drift:  22 },
  { left: "28%", size: 10, delay: "280ms",  duration: "2300ms", color: "#60a5fa", drift: -10 },
  { left: "40%", size: 7,  delay: "80ms",   duration: "2150ms", color: "#34d399", drift:  18 },
  { left: "52%", size: 9,  delay: "200ms",  duration: "2450ms", color: "#a78bfa", drift: -20 },
  { left: "64%", size: 6,  delay: "320ms",  duration: "2250ms", color: "#f59e0b", drift:  14 },
  { left: "75%", size: 8,  delay: "100ms",  duration: "2350ms", color: "#38bdf8", drift: -18 },
  { left: "86%", size: 7,  delay: "240ms",  duration: "2200ms", color: "#4ade80", drift:  20 },
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
      {/* Confetti */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="celebration-confetti"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size * 1.9}px`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            background: p.color,
            ["--drift" as string]: p.drift,
          }}
        />
      ))}

      {/* Card */}
      <div className="absolute left-1/2 top-1/2 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="celebration-card relative overflow-hidden rounded-[28px] border border-white/10 shadow-[0_40px_120px_rgba(2,6,23,0.80)]">

          {/* Background: F1 car image, escurecida e levemente desfocada */}
          <img
            src="/Fotos_landing_CRM/F1_CRM_delado.jpeg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center blur-[2px] scale-105"
          />

          {/* Overlay escuro para legibilidade */}
          <div className="absolute inset-0 bg-[rgba(5,10,28,0.82)]" />

          {/* Shimmer top line */}
          <div className="absolute inset-x-8 top-0 z-10 h-px bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.6),transparent)]" />

          {/* Content */}
          <div className="relative z-10 px-7 py-8 text-center">
            {/* Logo */}
            <img
              src="/logo-garagem.svg"
              alt="Garagem CRM"
              className="mx-auto h-7 w-auto opacity-90"
            />

            {/* Badge */}
            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
                <BadgeCheck className="h-3 w-3" />
                Venda concluída
              </span>
            </div>

            {/* Headline */}
            <h3 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              {sellerFirstName ? `${sellerFirstName}, fechou mais uma.` : "Negócio fechado."}
            </h3>

            {/* Subtext */}
            <p className="mt-2 text-sm text-slate-300">
              {leadFirstName
                ? `${leadFirstName} entrou em vendido. Resultado no funil.`
                : "Lead marcado como vendido."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
