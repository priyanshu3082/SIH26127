import { Card, CardContent, CardHeader, CardTitle, Badge } from "@sih/ui";
import { Camera, Route, BarChart3, ShieldAlert, CheckCircle2 } from "lucide-react";

interface Deliverable {
  icon: React.ElementType;
  title: string;
  brief: string;
  screens: { name: string; note: string }[];
  techniques: string[];
}

const DELIVERABLES: Deliverable[] = [
  {
    icon: Camera,
    title: "1. High-Precision ANPR/OCR Module",
    brief:
      "Detect vehicles and plates, read plate text accurately across lighting, weather, angle and blur conditions.",
    screens: [{ name: "apps/ml-service", note: "FastAPI inference service — /infer and /replay endpoints" }],
    techniques: [
      "YOLOv8 vehicle detection (COCO-pretrained) + custom-trained plate detector",
      "EasyOCR text extraction with an Indian-plate structural validator",
      "CLAHE histogram equalization for low-light plates",
      "Unsharp-mask sharpening pass for motion blur",
      "3-stage escalating pre-processing retry ladder when structural validation fails",
      "Confusion-map correction for OCR-ambiguous characters (0/O, 1/I, 5/S, 8/B, 2/Z, 4/A, H/W)",
      "Optional OpenRouter LLM vision cross-check as a last-resort escalation",
    ],
  },
  {
    icon: Route,
    title: "2. Trajectory Reconstruction Engine",
    brief: "Link a vehicle's sightings across cameras into one ordered route, tolerant of OCR misreads.",
    screens: [{ name: "Track Vehicle", note: "Fuzzy plate search, animated point-by-point route playback" }],
    techniques: [
      "Levenshtein-distance fuzzy plate matching (tolerates a 1-character OCR misread)",
      "Haversine-based segment distance/duration/speed calculation per camera pair",
      "Per-segment plausibility flagging (implausible-speed segments marked as anomalies)",
    ],
  },
  {
    icon: BarChart3,
    title: "3. City Traffic Analytics Dashboard",
    brief: "City-wide flow patterns and congestion, not just per-camera counts.",
    screens: [{ name: "City Map", note: "Live heatmap, camera status grid, city-wide stats rail" }],
    techniques: [
      "5-minute rolling traffic aggregates (vehicle count, avg speed, congestion score) per camera",
      "Hourly OD-matrix estimation linking consecutive same-plate sightings across camera pairs",
      "In-process scheduler recomputing aggregates every minute (stands in for a BullMQ/Redis worker)",
    ],
  },
  {
    icon: ShieldAlert,
    title: "4. Real-Time Alert System",
    brief: "Flag a watchlisted vehicle or a physically implausible route the moment it's detected.",
    screens: [
      { name: "Alerts", note: "Filterable table + map, acknowledge/resolve workflow" },
      { name: "Watchlist", note: "Add/deactivate watchlisted plates with reason + expiry" },
    ],
    techniques: [
      "Blacklist match evaluated synchronously on every detection ingest",
      "Route-anomaly detection: flags a plate whose consecutive sightings imply >140 km/h",
      "WebSocket push to the dashboard the same request the detection is persisted — no polling",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 overflow-y-auto px-6 py-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">SIH26127 · Trajectory Titans</p>
        <h1 className="font-display text-2xl font-semibold text-text-primary">About This Solution</h1>
        <p className="max-w-2xl font-mono text-sm text-text-secondary">
          City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics — built for
          Bharat Electronics Limited (BEL). Every screen below maps directly to one of the problem statement's four
          required deliverables.
        </p>
      </header>

      <div className="space-y-5">
        {DELIVERABLES.map((d) => (
          <Card key={d.title}>
            <CardHeader className="items-start">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-3 text-cyan-400">
                  <d.icon className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle>{d.title}</CardTitle>
                  <p className="mt-1 max-w-xl font-mono text-xs text-text-secondary">{d.brief}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {d.screens.map((s) => (
                  <Badge key={s.name} tone="cyan" title={s.note}>
                    {s.name}
                  </Badge>
                ))}
              </div>
              <ul className="space-y-1.5">
                {d.techniques.map((t) => (
                  <li key={t} className="flex items-start gap-2 font-mono text-xs text-text-secondary">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <footer className="border-t border-border-subtle pt-4 font-mono text-xs text-text-disabled">
        Infra note: runs on Postgres (Render) + Next.js (Vercel) in this deployment instead of the original
        PostGIS/Kafka/Docker plan — no Docker on the build machine, so geospatial math is Haversine-based
        application code and live events are pushed directly over WebSocket rather than through a message broker.
        Both are drop-in upgrades behind the same interfaces if the project moves to that infra later.
      </footer>
    </div>
  );
}
