import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isDestructive = props.variant === "destructive";

        return (
          <Toast key={id} {...props}>
            <div
              className={isDestructive
                ? "flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/15 bg-red-500/12 text-red-200"
                : "flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/15 bg-blue-500/12 text-blue-200"
              }
            >
              {isDestructive ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div className="grid gap-1.5 pr-2">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
              {action ? <div className="pt-2">{action}</div> : null}
            </div>
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
