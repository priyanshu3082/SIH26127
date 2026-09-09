"use client";

import * as React from "react";
import { Skeleton, cn } from "@sih/ui";
import { useCityStats } from "@/lib/api";

function StatInline({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "critical" | "warn";
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          tone === "critical" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-text-primary",
        )}
      >
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
    </div>
  );
}

/**
 * A HUD strip floating over the map, not a row of card widgets — one hero
 * number (today's detection count) carries the visual weight, the rest
 * read as compact inline stats separated by dividers. The one deliberate
 * accent moment: activeAlerts gets a red glow only when it's actually
 * nonzero, so the glow means something instead of decorating every card.
 */
export function StatsRail() {
  const { data, isLoading } = useCityStats();

  if (isLoading || !data) {
    return (
      <div className="pointer-events-none absolute left-4 right-4 top-4 z-10">
        <Skeleton className="h-14 rounded-md" />
      </div>
    );
  }

  const hasAlerts = data.activeAlerts > 0;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-4 right-4 top-4 z-10 flex items-center gap-6 overflow-x-auto",
        "rounded-md border border-border-subtle bg-bg-0 px-5 py-3",
        hasAlerts && "border-red-500/30 shadow-glow-red",
      )}
    >
      <div className="flex shrink-0 items-baseline gap-2">
        <span className="font-display text-3xl font-semibold leading-none tabular-nums text-text-primary">
          {data.totalDetectionsToday.toLocaleString("en-IN")}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">detections today</span>
      </div>

      <div className="h-8 w-px shrink-0 bg-border-subtle" />

      <div className="flex shrink-0 items-center gap-5">
        <StatInline label="open alerts" value={data.activeAlerts} tone={hasAlerts ? "critical" : undefined} />
        <StatInline label="avg speed" value={`${data.avgCitySpeedKmph} km/h`} />
        <StatInline label="busiest" value={data.busiestCorridor} />
        <StatInline
          label="cameras"
          value={`${data.onlineCameras}/${data.totalCameras}`}
          tone={data.onlineCameras < data.totalCameras ? "warn" : undefined}
        />
      </div>
    </div>
  );
}
