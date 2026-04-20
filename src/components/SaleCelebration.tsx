import { PartyPopper, Sparkles, Star } from "lucide-react";

interface SaleCelebrationProps {
  open: boolean;
  leadName?: string | null;
  sellerName?: string | null;
}

const particles = [
  { left: "8%", size: 10, delay: "0ms", duration: "1900ms", color: "#fbbf24" },
  { left: "16%", size: 8, delay: "120ms", duration: "2100ms", color: "#60a5fa" },
  { left: "24%", size: 12, delay: "260ms", duration: "2000ms", color: "#34d399" },
  { left: "32%", size: 9, delay: "80ms", duration: "1800ms", color: "#f472b6" },
  { left: "40%", size: 11, delay: "240ms", duration: "2200ms", color: "#f59e0b" },
  { left: "48%", size: 7, delay: "180ms", duration: "1950ms", color: "#22d3ee" },
  { left: "56%", size: 10, delay: "20ms", duration: "2050ms", color: "#a78bfa" },
  { left: "64%", size: 8, delay: "320ms", duration: "1850ms", color: "#fb7185" },
  { left: "72%", size: 12, delay: "140ms", duration: "2150ms", color: "#38bdf8" },
  { left: "80%", size: 9, delay: "60ms", duration: "2000ms", color: "#4ade80" },
  { left: "88%", size: 11, delay: "280ms", duration: "2100ms", color: "#facc15" },
  { left: "92%", size: 7, delay: "200ms", duration: "1900ms", color: "#c084fc" },
];

export function SaleCelebration({ open, leadName, sellerName }: SaleCelebrationProps) {
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_42%)]" />

      {particles.map((particle, index) => (
        <span
          key={`${particle.left}-${index}`}
          className="celebration-confetti"
          style={{
            left: particle.left,
            width: `${particle.size}px`,
            height: `${particle.size * 1.8}px`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            background: particle.color,
          }}
        />
      ))}

      <div className="absolute left-1/2 top-[14%] h-40 w-40 -translate-x-1/2 rounded-full bg-blue-500/30 blur-3xl celebration-firework-ring" />
      <div className="absolute left-[22%] top-[20%] text-amber-300 celebration-float-spark" style={{ animationDelay: "120ms" }}>
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="absolute right-[24%] top-[22%] text-sky-300 celebration-float-spark" style={{ animationDelay: "260ms" }}>
        <Star className="h-5 w-5" />
      </div>
      <div className="absolute left-[30%] top-[28%] text-emerald-300 celebration-float-spark" style={{ animationDelay: "380ms" }}>
        <Sparkles className="h-5 w-5" />
      </div>

      <div className="absolute left-1/2 top-24 w-full max-w-md -translate-x-1/2 px-4">
        <div className="celebration-card rounded-[28px] border border-white/15 px-6 py-5 text-center shadow-[0_30px_80px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#60a5fa)] text-white shadow-[0_16px_40px_rgba(37,99,235,0.4)]">
            <PartyPopper className="h-8 w-8" />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">Venda concluida</p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {sellerName ? `Parabens, ${sellerName}!` : "Parabens pela venda!"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {leadName
              ? `${leadName} acabou de entrar em vendido. Excelente trabalho${sellerName ? `, ${sellerName}` : ""}.`
              : `Mais um card chegou em vendido. Excelente trabalho${sellerName ? `, ${sellerName}` : " da equipe"}.`}
          </p>
        </div>
      </div>
    </div>
  );
}