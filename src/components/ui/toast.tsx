import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-3 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[440px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative grid w-full grid-cols-[auto_1fr] items-start gap-4 overflow-hidden rounded-[24px] border p-4 pr-12 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full before:absolute before:inset-y-4 before:left-0 before:w-[3px] before:rounded-full",
  {
    variants: {
      variant: {
        default:
          "border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.96),rgba(7,12,24,0.92))] text-foreground before:bg-[linear-gradient(180deg,#60a5fa,#3b82f6)]",
        destructive:
          "destructive border-red-500/20 bg-[linear-gradient(180deg,rgba(36,10,16,0.96),rgba(24,7,11,0.94))] text-red-50 before:bg-[linear-gradient(180deg,#fb7185,#ef4444)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/90 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 group-[.destructive]:border-red-400/20 group-[.destructive]:bg-red-500/10 group-[.destructive]:text-red-50 group-[.destructive]:hover:bg-red-500/15 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full border border-white/8 bg-white/5 p-1.5 text-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 group-[.destructive]:border-red-400/10 group-[.destructive]:bg-red-500/10 group-[.destructive]:text-red-200 group-[.destructive]:hover:bg-red-500/15 group-[.destructive]:hover:text-red-50",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-base font-semibold tracking-[-0.02em]", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm leading-6 text-slate-300 group-[.destructive]:text-red-100/85", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
