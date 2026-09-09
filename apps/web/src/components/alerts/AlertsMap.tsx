"use client";

import * as React from "react";
import Map from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AlertWithContext } from "@sih/types";
import { deckColors } from "@sih/ui";

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const INITIAL_VIEW_STATE = { longitude: 88.4172, latitude: 22.5793, zoom: 12.2, pitch: 0, bearing: 0 };

const SEVERITY_COLOR: Record<string, [number, number, number]> = {
  critical: deckColors.red,
  high: deckColors.red,
  medium: deckColors.amber,
  low: [148, 163, 184],
};

export function AlertsMap({ alerts }: { alerts: AlertWithContext[] }) {
  const [hoverInfo, setHoverInfo] = React.useState<{ x: number; y: number; alert: AlertWithContext } | null>(null);

  const layers = [
    new ScatterplotLayer<AlertWithContext>({
      id: "alert-pins",
      data: alerts,
      pickable: true,
      stroked: true,
      getPosition: (d) => [d.camera.lng, d.camera.lat],
      getRadius: 16,
      radiusUnits: "pixels",
      getFillColor: (d) => [...(SEVERITY_COLOR[d.severity] ?? deckColors.cyan), 230],
      getLineColor: [255, 255, 255, 255],
      lineWidthMinPixels: 2,
      onHover: (info) => {
        if (info.object) setHoverInfo({ x: info.x, y: info.y, alert: info.object as AlertWithContext });
        else setHoverInfo(null);
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
          <p className="font-mono text-xs font-semibold text-red-300">{hoverInfo.alert.plateText}</p>
          <p className="font-display text-sm text-text-primary">{hoverInfo.alert.camera.code}</p>
          <p className="max-w-xs font-mono text-xs text-text-muted">{hoverInfo.alert.message}</p>
        </div>
      )}
    </div>
  );
}
