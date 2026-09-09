"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CarFront } from "lucide-react";
import { Badge, EmptyState } from "@sih/ui";
import { useRecentDetections } from "@/lib/api";
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

function formatPlateDisplay(plate: string): string {
  const m = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/.exec(plate);
  if (!m) return plate;
  return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}

export function RecentDetectionsFeed() {
  const { data, isLoading } = useRecentDetections(25);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h3 className="font-display text-sm font-semibold text-text-primary">Live Detection Feed</h3>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          STREAMING
        </span>
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
              className="flex items-center gap-3 border-b border-border-subtle px-4 py-2.5 hover:bg-bg-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-2 text-text-secondary">
                <CarFront className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-semibold text-text-primary">
                  {formatPlateDisplay(d.plateText)}
                </p>
                <p className="truncate font-mono text-[11px] text-text-muted">
                  {d.camera.code} · {d.vehicleType}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={d.confidenceScore > 0.85 ? "green" : "amber"} className="px-1.5 py-0">
                  {(d.confidenceScore * 100).toFixed(0)}%
                </Badge>
                <span className="font-mono text-[10px] text-text-disabled">{timeAgo(d.detectedAt)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
