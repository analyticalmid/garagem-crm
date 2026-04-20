import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group toast flex items-center gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.96),rgba(7,12,24,0.92))] px-4 py-4 text-foreground shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl",
          title: "text-base font-semibold tracking-[-0.02em] text-white",
          description: "text-sm leading-6 text-slate-300",
          success:
            "border-emerald-400/20 bg-[linear-gradient(180deg,rgba(8,24,20,0.96),rgba(7,14,12,0.94))] [&_[data-icon]]:border-emerald-400/15 [&_[data-icon]]:bg-emerald-500/12 [&_[data-icon]]:text-emerald-200",
          error:
            "border-red-400/20 bg-[linear-gradient(180deg,rgba(36,10,16,0.96),rgba(24,7,11,0.94))] [&_[data-icon]]:border-red-400/15 [&_[data-icon]]:bg-red-500/12 [&_[data-icon]]:text-red-200 [&_[data-description]]:text-red-100/85",
          info:
            "border-blue-400/20 bg-[linear-gradient(180deg,rgba(10,16,32,0.96),rgba(7,12,24,0.92))] [&_[data-icon]]:border-blue-400/15 [&_[data-icon]]:bg-blue-500/12 [&_[data-icon]]:text-blue-200",
          warning:
            "border-amber-400/20 bg-[linear-gradient(180deg,rgba(38,24,8,0.96),rgba(22,14,7,0.94))] [&_[data-icon]]:border-amber-400/15 [&_[data-icon]]:bg-amber-500/12 [&_[data-icon]]:text-amber-100",
          icon: "flex h-11 w-11 items-center justify-center rounded-2xl border",
          closeButton:
            "right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/5 text-foreground/60 transition hover:bg-white/10 hover:text-foreground",
          actionButton:
            "inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/90 transition hover:bg-white/10",
          cancelButton:
            "inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-transparent px-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-white/5 hover:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
