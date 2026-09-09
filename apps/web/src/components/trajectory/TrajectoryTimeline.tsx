"use client";

import * as React from "react";
import { Pause, Play, RotateCcw, TriangleAlert } from "lucide-react";
import { Button, cn } from "@sih/ui";
import type { DetectionWithCamera, TrajectorySegment } from "@sih/types";

export interface TrajectoryTimelineProps {
  detections: DetectionWithCamera[];
  segments: TrajectorySegment[];
  progress: number;
  playing: boolean;
  onToggle: () => void;
  onReset: () => void;
  onScrub: (index: number) => void;
}

/**
 * A transit-line-style route strip, not a wizard-step pill stepper: one
 * continuous line with stops as ticks along it, each segment individually
 * colored by whether it's been played yet and whether it's a flagged
 * anomaly — the anomaly is shown exactly where it happened on the route,
 * not as a separate floating badge disconnected from the map/timeline.
 */
export function TrajectoryTimeline({
  detections,
  segments,
  progress,
  playing,
  onToggle,
  onReset,
  onScrub,
}: TrajectoryTimelineProps) {
  const stopCount = detections.length;
  const hasAnomaly = segments.some((s) => !s.plausible);

  // Insets the usable range to 6%-94% instead of the full 0%-100%, so the
  // first/last stop's camera-code label (which overhangs its tick, centered
  // via translate) has room to render without clipping at the panel edge.
  const stopPct = (i: number) => (stopCount > 1 ? 6 + (i / (stopCount - 1)) * 88 : 50);

  return (
    <div className="flex items-center gap-4 border-t border-border-subtle bg-bg-1 px-4 py-3">
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="primary" size="icon" onClick={onToggle} disabled={!stopCount}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onReset} disabled={!stopCount}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative h-10 min-w-0 flex-1">
        {segments.map((seg, i) => {
          const leftPct = stopPct(i);
          const widthPct = stopPct(i + 1) - leftPct;
          const revealed = i < progress - 1;
          return (
            <div
              key={i}
              className={cn(
                "absolute top-1/2 h-px -translate-y-1/2 transition-colors duration-300",
                !seg.plausible ? "bg-red-500" : revealed ? "bg-cyan-500" : "bg-border",
              )}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            />
          );
        })}

        {detections.map((d, i) => {
          const pct = stopPct(i);
          const revealed = i < progress;
          const isCurrent = i === progress - 1;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onScrub(i + 1)}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
              style={{ left: `${pct}%` }}
              title={`${d.camera.code} — ${new Date(d.detectedAt).toLocaleTimeString("en-IN", { hour12: false })}`}
            >
              <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-text-muted">
                {d.camera.code.split("-").slice(0, 2).join("-")}
              </span>
              <span
                className={cn(
                  "block rounded-full border-2 border-bg-1 transition-all duration-300",
                  isCurrent
                    ? "h-3.5 w-3.5 bg-cyan-400 shadow-glow-cyan"
                    : revealed
                      ? "h-2.5 w-2.5 bg-cyan-600"
                      : "h-2.5 w-2.5 bg-text-disabled",
                )}
              />
              <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[9px] text-text-disabled">
                {new Date(d.detectedAt).toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" })}
              </span>
            </button>
          );
        })}
      </div>

      {hasAnomaly && (
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-red-400">
          <TriangleAlert className="h-3.5 w-3.5" /> anomalous segment
        </span>
      )}
    </div>
  );
}
