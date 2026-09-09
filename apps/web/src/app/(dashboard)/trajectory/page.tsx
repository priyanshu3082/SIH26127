"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Route } from "lucide-react";
import { EmptyState } from "@sih/ui";
import { PlateSearch } from "@/components/trajectory/PlateSearch";
import { TrajectoryMap } from "@/components/trajectory/TrajectoryMap";
import { TrajectoryTimeline } from "@/components/trajectory/TrajectoryTimeline";
import { TrajectorySummary } from "@/components/trajectory/TrajectorySummary";
import { usePlayback } from "@/components/trajectory/usePlayback";
import { fetchTrajectory } from "@/lib/api";

export default function TrajectoryPage() {
  const mutation = useMutation({
    mutationFn: (plate: string) => fetchTrajectory(plate),
  });

  const result = mutation.data;
  const detections = result?.detections ?? [];
  const { progress, playing, toggle, reset, setProgress } = usePlayback(detections.length);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b border-border-subtle bg-bg-1 px-4 py-3">
        <PlateSearch onSearch={(plate) => mutation.mutate(plate)} loading={mutation.isPending} />
        {mutation.isError && (
          <p className="font-mono text-xs text-red-400">
            No matching vehicle found — try a plate from the Live Detection Feed on the City Map.
          </p>
        )}
      </div>

      {result && <TrajectorySummary result={result} />}

      <div className="min-h-0 flex-1">
        {!result ? (
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState
              icon={<Route className="h-6 w-6" />}
              title="Search a plate to reconstruct its route"
              description="Fuzzy matching tolerates a single OCR misread character — try WB05CF3475 (blacklisted, always resolvable) or any plate from the live feed."
            />
          </div>
        ) : (
          <TrajectoryMap detections={detections} progress={progress} />
        )}
      </div>

      {result && (
        <TrajectoryTimeline
          detections={detections}
          segments={result.segments}
          progress={progress}
          playing={playing}
          onToggle={toggle}
          onReset={reset}
          onScrub={setProgress}
        />
      )}
    </div>
  );
}
