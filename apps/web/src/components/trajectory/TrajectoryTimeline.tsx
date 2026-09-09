"use client";

import * as React from "react";
import { Pause, Play, RotateCcw, AlertTriangle } from "lucide-react";
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

export function TrajectoryTimeline({
  detections,
  segments,
  progress,
  playing,
  onToggle,
  onReset,
  onScrub,
}: TrajectoryTimelineProps) {
  return (
    <div className="flex items-center gap-3 border-t border-border-subtle bg-bg-1 px-4 py-3">
      <Button variant="primary" size="icon" onClick={onToggle} disabled={!detections.length}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={onReset} disabled={!detections.length}>
        <RotateCcw className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 items-center overflow-x-auto py-1">
        {detections.map((d, i) => {
          const revealed = i < progress;
          const isCurrent = i === progress - 1;
          const segmentBefore = i > 0 ? segments[i - 1] : null;
          return (
            <React.Fragment key={d.id}>
              {i > 0 && (
                <div
                  className={cn(
                    "h-px w-8 shrink-0 transition-colors duration-base",
                    revealed ? "bg-cyan-500" : "bg-border",
                    segmentBefore && !segmentBefore.plausible && "bg-red-500",
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => onScrub(i + 1)}
                className="flex shrink-0 flex-col items-center gap-1 px-1"
                title={`${d.camera.code} — ${new Date(d.detectedAt).toLocaleTimeString("en-IN", { hour12: false })}`}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] transition-all duration-base",
                    isCurrent
                      ? "border-cyan-400 bg-cyan-500 text-bg-0 shadow-glow-cyan"
                      : revealed
                        ? "border-cyan-600 bg-cyan-900 text-cyan-300"
                        : "border-border bg-bg-2 text-text-disabled",
                  )}
                >
                  {i + 1}
                </span>
                <span className="font-mono text-[9px] text-text-muted">
                  {new Date(d.detectedAt).toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {segments.some((s) => !s.plausible) && (
        <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-red-500/40 bg-red-900 px-2 py-1 font-mono text-[10px] text-red-300">
          <AlertTriangle className="h-3 w-3" /> Anomalous segment
        </span>
      )}
    </div>
  );
}
