"use client";

import * as React from "react";
import Map from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DetectionWithCamera } from "@sih/types";
import { deckColors } from "@sih/ui";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export interface TrajectoryMapProps {
  detections: DetectionWithCamera[];
  progress: number; // number of stops revealed, 0..detections.length
}

export function TrajectoryMap({ detections, progress }: TrajectoryMapProps) {
  const [hoverInfo, setHoverInfo] = React.useState<{ x: number; y: number; detection: DetectionWithCamera } | null>(
    null,
  );

  const initialViewState = React.useMemo(() => {
    if (!detections.length) {
      return { longitude: 88.4172, latitude: 22.5793, zoom: 12.6, pitch: 40, bearing: -10 };
    }
    const lats = detections.map((d) => d.camera.lat);
    const lngs = detections.map((d) => d.camera.lng);
    return {
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      zoom: 13,
      pitch: 40,
      bearing: -10,
    };
  }, [detections]);

  const revealed = detections.slice(0, Math.max(progress, detections.length ? 1 : 0));
  const fullPath = detections.map((d) => [d.camera.lng, d.camera.lat]);
  const revealedPath = revealed.map((d) => [d.camera.lng, d.camera.lat]);
  const current = revealed[revealed.length - 1];

  const layers = [
    // faint full route so the whole journey is visible even before playback catches up
    new PathLayer<{ path: number[][] }>({
      id: "trajectory-full-path",
      data: fullPath.length > 1 ? [{ path: fullPath }] : [],
      getPath: (d) => d.path as unknown as [number, number][],
      getColor: [148, 163, 184, 200],
      getWidth: 3,
      widthUnits: "pixels",
    }),
    new PathLayer<{ path: number[][] }>({
      id: "trajectory-revealed-path",
      data: revealedPath.length > 1 ? [{ path: revealedPath }] : [],
      getPath: (d) => d.path as unknown as [number, number][],
      getColor: [...deckColors.cyanBright, 230],
      getWidth: 4,
      widthUnits: "pixels",
    }),
    new ScatterplotLayer<DetectionWithCamera>({
      id: "trajectory-stops",
      data: detections,
      pickable: true,
      stroked: true,
      getPosition: (d) => [d.camera.lng, d.camera.lat],
      getRadius: (d) => (d.id === current?.id ? 12 : 7),
      radiusUnits: "pixels",
      getFillColor: (d, { index }) =>
        index < revealed.length ? [...deckColors.cyan, 255] : [70, 82, 105, 180],
      getLineColor: [7, 10, 16, 255],
      lineWidthMinPixels: 2,
      onHover: (info) => {
        if (info.object) setHoverInfo({ x: info.x, y: info.y, detection: info.object as DetectionWithCamera });
        else setHoverInfo(null);
      },
      updateTriggers: {
        getFillColor: [revealed.length],
        getRadius: [current?.id],
      },
      transitions: { getRadius: 200, getFillColor: 200 },
    }),
    ...(current
      ? [
          new ScatterplotLayer({
            id: "trajectory-current-glow",
            data: [current],
            getPosition: (d: DetectionWithCamera) => [d.camera.lng, d.camera.lat],
            getRadius: 20,
            radiusUnits: "pixels",
            getFillColor: [...deckColors.cyanBright, 60],
            stroked: false,
          }),
        ]
      : []),
  ];

  return (
    <div className="relative h-full w-full">
      <DeckGL initialViewState={initialViewState} controller layers={layers}>
        <Map mapStyle={MAP_STYLE} reuseMaps attributionControl={false} />
      </DeckGL>

      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border-strong bg-bg-4 px-3 py-2 shadow-lg"
          style={{ left: hoverInfo.x + 14, top: hoverInfo.y + 14 }}
        >
          <p className="font-mono text-xs font-semibold text-cyan-300">{hoverInfo.detection.camera.code}</p>
          <p className="font-display text-sm text-text-primary">{hoverInfo.detection.camera.name}</p>
          <p className="font-mono text-xs text-text-muted">
            {new Date(hoverInfo.detection.detectedAt).toLocaleTimeString("en-IN", { hour12: false })}
          </p>
        </div>
      )}
    </div>
  );
}
