"use client";

import * as React from "react";
import Map from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Camera, TrafficAggregate } from "@sih/types";
import { deckColors } from "@sih/ui";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const INITIAL_VIEW_STATE = {
  longitude: 88.4172,
  latitude: 22.5793,
  zoom: 12.6,
  pitch: 45,
  bearing: -10,
};

const STATUS_COLOR: Record<string, [number, number, number]> = {
  online: deckColors.green,
  degraded: deckColors.amber,
  offline: deckColors.red,
};

export interface CityMapProps {
  cameras: Camera[];
  heatmapPoints: (TrafficAggregate & { camera: Camera })[];
  onCameraClick?: (camera: Camera) => void;
  hoveredCameraId?: string | null;
}

export function CityMap({ cameras, heatmapPoints, onCameraClick, hoveredCameraId }: CityMapProps) {
  const [hoverInfo, setHoverInfo] = React.useState<{ x: number; y: number; camera: Camera } | null>(null);

  const layers = [
    new HeatmapLayer({
      id: "congestion-heatmap",
      data: heatmapPoints,
      getPosition: (d: TrafficAggregate & { camera: Camera }) => [d.camera.lng, d.camera.lat],
      getWeight: (d: TrafficAggregate & { camera: Camera }) => d.congestionScore,
      radiusPixels: 60,
      intensity: 1.1,
      threshold: 0.04,
      colorRange: [
        [10, 17, 26, 0],
        [34, 197, 224, 90],
        [63, 216, 240, 140],
        [245, 158, 11, 170],
        [239, 68, 68, 210],
        [200, 48, 47, 255],
      ],
    }),
    new ScatterplotLayer<Camera>({
      id: "camera-pins",
      data: cameras,
      pickable: true,
      stroked: true,
      getPosition: (d) => [d.lng, d.lat],
      getRadius: (d) => (d.id === hoveredCameraId ? 34 : 22),
      radiusUnits: "pixels",
      getFillColor: (d) => STATUS_COLOR[d.status] ?? deckColors.cyan,
      getLineColor: [7, 10, 16, 255],
      lineWidthMinPixels: 2,
      onHover: (info) => {
        if (info.object) {
          setHoverInfo({ x: info.x, y: info.y, camera: info.object as Camera });
        } else {
          setHoverInfo(null);
        }
      },
      onClick: (info) => {
        if (info.object) onCameraClick?.(info.object as Camera);
      },
      updateTriggers: {
        getRadius: [hoveredCameraId],
      },
      transitions: {
        getRadius: 150,
      },
    }),
  ];

  return (
    <div className="relative h-full w-full">
      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller layers={layers}>
        <Map mapStyle={MAP_STYLE} reuseMaps attributionControl={false} />
      </DeckGL>

      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border-strong bg-bg-4 px-3 py-2 shadow-lg"
          style={{ left: hoverInfo.x + 14, top: hoverInfo.y + 14 }}
        >
          <p className="font-mono text-xs font-semibold text-cyan-300">{hoverInfo.camera.code}</p>
          <p className="font-display text-sm text-text-primary">{hoverInfo.camera.name}</p>
          <p className="font-mono text-xs text-text-muted">
            {hoverInfo.camera.roadName} · {hoverInfo.camera.zone}
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-4 rounded-md border border-border-subtle bg-bg-1/90 px-3 py-2 backdrop-blur-sm">
        <LegendDot color="bg-green-500" label="Online" />
        <LegendDot color="bg-amber-500" label="Degraded" />
        <LegendDot color="bg-red-500" label="Offline" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="font-mono text-[11px] text-text-secondary">{label}</span>
    </div>
  );
}
