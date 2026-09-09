/**
 * Live-detection replay simulator for demos/judging.
 *
 * Stands in for real camera feeds + the ml-service inference stream: every
 * few seconds it POSTs a synthetic detection to /api/detections (the same
 * endpoint the real ml-service will call), so the dashboard's "live" feed,
 * alert toasts, and analytics all animate during a judged demo without
 * needing actual camera hardware.
 *
 * Run with: pnpm --filter api simulate   (with the api dev server running)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE ?? "http://localhost:4000/api";
const TICK_MS = 4000;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function tick(cameras: { id: string }[], knownPlates: string[], blacklisted: string[]) {
  const camera = cameras[randInt(0, cameras.length - 1)];

  // ~7% of ticks replay a blacklisted plate so alerts visibly fire during a demo.
  const useBlacklist = blacklisted.length > 0 && Math.random() < 0.07;
  const plateText = useBlacklist
    ? blacklisted[randInt(0, blacklisted.length - 1)]
    : Math.random() < 0.6 && knownPlates.length > 0
      ? knownPlates[randInt(0, knownPlates.length - 1)]
      : `WB${String(randInt(1, 20)).padStart(2, "0")}${["A", "B", "C"][randInt(0, 2)]}${String(
          randInt(1, 9999),
        ).padStart(4, "0")}`;

  const vehicleType = ["Car", "Motorcycle", "Auto", "Bus", "Truck"][randInt(0, 4)];

  const body = {
    cameraId: camera.id,
    plateTextRaw: plateText,
    confidenceScore: Math.round((0.8 + Math.random() * 0.19) * 100) / 100,
    detectedAt: new Date().toISOString(),
    vehicleType,
    speedEstimateKmph: randInt(15, 55),
  };

  try {
    const res = await fetch(`${API_BASE}/detections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { alerts?: unknown[] };
    const alertNote = json.alerts?.length ? `  -> ${json.alerts.length} alert(s) fired` : "";
    console.log(`[sim] ${plateText} @ ${camera.id}${alertNote}`);
  } catch (err) {
    console.error("[sim] failed to post detection:", (err as Error).message);
  }
}

async function main() {
  const cameras = await prisma.camera.findMany({ select: { id: true } });
  const vehicles = await prisma.vehicle.findMany({ select: { plateText: true, isBlacklisted: true } });
  const knownPlates = vehicles.filter((v) => !v.isBlacklisted).map((v) => v.plateText);
  const blacklisted = vehicles.filter((v) => v.isBlacklisted).map((v) => v.plateText);

  if (cameras.length === 0) {
    console.error("No cameras found — run `pnpm --filter api seed` first.");
    process.exit(1);
  }

  console.log(`[sim] replaying detections every ${TICK_MS}ms against ${API_BASE} (Ctrl+C to stop)`);
  setInterval(() => {
    tick(cameras, knownPlates, blacklisted).catch(() => {});
  }, TICK_MS);
}

main();
