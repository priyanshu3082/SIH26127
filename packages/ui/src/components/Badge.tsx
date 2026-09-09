import * as React from "react";
import { cn } from "../utils";

type Tone = "neutral" | "cyan" | "amber" | "red" | "green";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  children?: React.ReactNode;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-bg-3 text-text-secondary border-border",
  cyan: "bg-cyan-900 text-cyan-200 border-cyan-600/40",
  amber: "bg-amber-900 text-amber-300 border-amber-500/40",
  red: "bg-red-900 text-red-300 border-red-500/40",
  green: "bg-green-900 text-green-400 border-green-500/40",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-text-muted",
  cyan: "bg-cyan-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
  green: "bg-green-400",
};

export function Badge({ className, tone = "neutral", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-mono uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />}
      {children}
    </span>
  );
}
