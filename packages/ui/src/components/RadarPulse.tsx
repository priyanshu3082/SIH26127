import * as React from "react";
import { cn } from "../utils";

export interface RadarPulseProps {
  active: boolean;
  size?: number;
  className?: string;
}

/**
 * Live-status indicator built specifically for this product's domain
 * (surveillance radar) instead of the generic pulsing-dot-in-a-pill badge
 * every AI-generated dashboard reaches for. A thin ring with a rotating
 * sweep when live; a plain dim dot when not.
 */
export function RadarPulse({ active, size = 14, className }: RadarPulseProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {active && (
        <span
          className="absolute inset-0 animate-radar-sweep rounded-full"
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, rgba(63,216,240,0.55) 18%, transparent 34%)",
          }}
        />
      )}
      <span
        className={cn(
          "absolute inset-0 rounded-full border",
          active ? "border-cyan-600/50" : "border-border-strong",
        )}
      />
      <span className={cn("h-1 w-1 rounded-full", active ? "bg-cyan-300" : "bg-text-disabled")} />
    </span>
  );
}
