import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertTriangle, Info, ShieldAlert, X } from "lucide-react";
import { cn } from "../utils";

export const ToastProvider = ToastPrimitive.Provider;

export function ToastViewport({ className, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn("fixed top-4 right-4 z-[100] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2", className)}
      {...props}
    />
  );
}

type ToastTone = "info" | "warning" | "critical";

const toneIcon: Record<ToastTone, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

const toneClasses: Record<ToastTone, string> = {
  info: "border-cyan-600/40 shadow-glow-cyan",
  warning: "border-amber-500/40",
  critical: "border-red-500/50 shadow-glow-red",
};

const toneIconClasses: Record<ToastTone, string> = {
  info: "text-cyan-400",
  warning: "text-amber-400",
  critical: "text-red-400",
};

export interface AppToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  tone?: ToastTone;
  title: string;
  description?: string;
}

export const AppToast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, AppToastProps>(
  ({ className, tone = "info", title, description, ...props }, ref) => {
    const Icon = toneIcon[tone];
    return (
      <ToastPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex items-start gap-3 rounded-lg border bg-bg-3 px-4 py-3",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-right-8 data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          "data-[swipe=end]:animate-out",
          toneClasses[tone],
          className,
        )}
        {...props}
      >
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toneIconClasses[tone])} />
        <div className="flex-1 min-w-0">
          <ToastPrimitive.Title className="font-display text-sm font-semibold text-text-primary">
            {title}
          </ToastPrimitive.Title>
          {description && (
            <ToastPrimitive.Description className="mt-0.5 font-mono text-xs text-text-secondary truncate">
              {description}
            </ToastPrimitive.Description>
          )}
        </div>
        <ToastPrimitive.Close className="text-text-muted hover:text-text-primary">
          <X className="h-3.5 w-3.5" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    );
  },
);
AppToast.displayName = "AppToast";
