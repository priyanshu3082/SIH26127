"use client";

import { Route, Clock, MapPin, TriangleAlert } from "lucide-react";
import type { TrajectoryResult } from "@sih/types";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function TrajectorySummary({ result }: { result: TrajectoryResult }) {
  const anomalies = result.segments.filter((s) => !s.plausible).length;

  const items = [
    { icon: MapPin, label: "Stops", value: result.detections.length },
    { icon: Route, label: "Distance", value: `${result.totalDistanceKm.toFixed(1)} km` },
    { icon: Clock, label: "Duration", value: formatDuration(result.totalDurationSeconds) },
    { icon: TriangleAlert, label: "Anomalies", value: anomalies, alert: anomalies > 0 },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border-subtle px-4 py-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Plate</p>
        <p className="font-mono text-lg font-semibold text-cyan-300">{result.plateText}</p>
      </div>
      <div className="h-8 w-px bg-border-subtle" />
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <item.icon className={`h-4 w-4 ${item.alert ? "text-red-400" : "text-text-muted"}`} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{item.label}</p>
            <p className={`font-display text-sm font-semibold ${item.alert ? "text-red-400" : "text-text-primary"}`}>
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
