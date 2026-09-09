"use client";

import * as React from "react";
import { CityMap } from "@/components/map/CityMap";
import { StatsRail } from "@/components/dashboard/StatsRail";
import { RecentDetectionsFeed } from "@/components/dashboard/RecentDetectionsFeed";
import { useCameras, useHeatmap } from "@/lib/api";
import type { Camera } from "@sih/types";

export default function CityOverviewPage() {
  const { data: cameras } = useCameras();
  const { data: heatmap } = useHeatmap();
  const [hoveredCameraId, setHoveredCameraId] = React.useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <StatsRail />
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <CityMap
            cameras={cameras ?? []}
            heatmapPoints={heatmap ?? []}
            hoveredCameraId={hoveredCameraId}
            onCameraClick={(camera: Camera) => setHoveredCameraId(camera.id)}
          />
        </div>
        <div className="w-80 shrink-0 border-l border-border-subtle bg-bg-1">
          <RecentDetectionsFeed />
        </div>
      </div>
    </div>
  );
}
