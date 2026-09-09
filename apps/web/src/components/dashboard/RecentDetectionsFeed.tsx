"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CarFront } from "lucide-react";
import { EmptyState, RadarPulse, cn } from "@sih/ui";
import { useRecentDetections } from "@/lib/api";
import { formatPlateDisplay } from "@/lib/plates";
import type { DetectionWithCamera } from "@sih/types";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function RecentDetectionsFeed() {
  const { data, isLoading } = useRecentDetections(25);

  // The one deliberate glow moment in this panel: flash the row that just
  // arrived, once, rather than a decorative pulse on every card.
  const [flashId, setFlashId] = React.useState<string | null>(null);
  const seenTopId = React.useRef<string | null>(null);

  React.useEffect(() => {
    const topId = data?.[0]?.id;
    if (!topId) return;
    const prev = seenTopId.current;
    seenTopId.current = topId;
    if (prev && prev !== topId) {
      setFlashId(topId);
      const t = setTimeout(() => setFlashId(null), 1100);
      return () => clearTimeout(t);
    }
  }, [data]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h3 className="font-display text-sm font-semibold text-text-primary">Live Detection Feed</h3>
        <div className="flex items-center gap-1.5">
          <RadarPulse active={!isLoading} size={12} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
            {isLoading ? "connecting" : "streaming"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!isLoading && !data?.length && (
          <div className="p-4">
            <EmptyState
              icon={<CarFront className="h-6 w-6" />}
              title="No detections yet"
              description="Run the demo replay simulator to see the live feed animate."
            />
          </div>
        )}

        <AnimatePresence initial={false}>
          {data?.map((d: DetectionWithCamera) => (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-center gap-3 border-b border-border-subtle px-4 py-2.5 hover:bg-bg-2",
                flashId === d.id && "animate-flash-in",
              )}
            >
              <CarFront className="h-4 w-4 shrink-0 text-text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-semibold text-text-primary">
                  {formatPlateDisplay(d.plateText)}
                </p>
                <p className="truncate font-mono text-[11px] text-text-muted">
                  {d.camera.code} · {d.vehicleType}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className={cn(
                    "font-mono text-xs font-semibold tabular-nums",
                    d.confidenceScore > 0.85 ? "text-green-400" : "text-amber-400",
                  )}
                >
                  {(d.confidenceScore * 100).toFixed(0)}%
                </span>
                <span className="font-mono text-[10px] text-text-disabled">{timeAgo(d.detectedAt)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
