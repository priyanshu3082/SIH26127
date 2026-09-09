"use client";

import * as React from "react";
import { Activity, AlertTriangle, Gauge, MapPinned, Radio } from "lucide-react";
import { Skeleton } from "@sih/ui";
import { useCityStats } from "@/lib/api";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: "cyan" | "red" | "amber";
}) {
  const accentClass =
    accent === "red" ? "text-red-400" : accent === "amber" ? "text-amber-400" : "text-cyan-400";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-1 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 ${accentClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
        <p className="truncate font-display text-lg font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export function StatsRail() {
  const { data, isLoading } = useCityStats();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[62px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
      <StatCard icon={Activity} label="Detections Today" value={data.totalDetectionsToday.toLocaleString("en-IN")} />
      <StatCard
        icon={AlertTriangle}
        label="Active Alerts"
        value={data.activeAlerts}
        accent={data.activeAlerts > 0 ? "red" : undefined}
      />
      <StatCard icon={Gauge} label="Avg City Speed" value={`${data.avgCitySpeedKmph} km/h`} />
      <StatCard icon={MapPinned} label="Busiest Corridor" value={data.busiestCorridor} />
      <StatCard
        icon={Radio}
        label="Cameras Online"
        value={`${data.onlineCameras}/${data.totalCameras}`}
        accent={data.onlineCameras < data.totalCameras ? "amber" : undefined}
      />
    </div>
  );
}
