/**
 * Synthetic demo dataset generator (brief section 3).
 *
 * Produces: ~35 cameras across a plausible Salt Lake (Kolkata) sector grid,
 * ~250 vehicles with realistic Indian plates, 3 days of detection events
 * including ~40 "commuter" vehicles with repeated morning/evening routes (so
 * trajectory reconstruction + OD-matrix demos have something meaningful),
 * 5 pre-seeded blacklisted plates with open alerts, pre-computed traffic
 * aggregates / OD-matrix rows so analytics screens aren't empty on first
 * load, and two auth users (admin / operator).
 *
 * Run with: pnpm --filter api seed
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { estimateRoadDistanceKm, speedKmph } from "../src/common/geo";

const prisma = new PrismaClient();

// ---- Salt Lake, Kolkata approximate center ----
const BASE_LAT = 22.5793;
const BASE_LNG = 88.4172;

const STATE_CODE_WEIGHTS: [string, number][] = [
  ["WB", 70],
  ["DL", 8],
  ["MH", 6],
  ["KA", 5],
  ["UP", 4],
  ["OD", 4],
  ["JH", 3],
];

const SERIES_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"];

const ROAD_NAMES = [
  "Sector V Main Road",
  "Karunamoyee Road",
  "VIP Road",
  "Broadway",
  "Central Park Road",
  "EM Bypass Service Road",
  "Webel More Road",
  "Labony Road",
  "Doltala Road",
  "CK Market Road",
  "Krishnapur Road",
  "Nicco Park Road",
  "Wipro More Road",
  "City Centre Road",
  "Tank No. 4 Road",
  "Tank No. 5 Road",
  "Global IT Park Road",
  "Bikash Bhavan Road",
];

const JUNCTIONS = [
  "Karunamoyee More",
  "City Centre Crossing",
  "Webel More",
  "Central Park Gate",
  "Wipro More",
  "Tank No. 4 Junction",
  "Tank No. 5 Junction",
  "Labony More",
  "Doltala Crossing",
  "CK Market Junction",
  "Krishnapur Crossing",
  "Nicco Park Gate",
  "Global IT Park Gate",
  "Bikash Bhavan Crossing",
  "Broadway-EM Bypass Junction",
];

function weightedPick<T>(items: [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [item, w] of items) {
    if (r < w) return item;
    r -= w;
  }
  return items[0][0];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPlate(): string {
  const state = weightedPick(STATE_CODE_WEIGHTS);
  const district = String(randInt(1, 20)).padStart(2, "0");
  const seriesLen = randInt(1, 2);
  let series = "";
  for (let i = 0; i < seriesLen; i++) series += SERIES_LETTERS[randInt(0, SERIES_LETTERS.length - 1)];
  const number = String(randInt(1, 9999)).padStart(4, "0");
  return `${state}${district}${series}${number}`;
}

const VEHICLE_TYPES = ["Car", "Motorcycle", "Bus", "Truck", "Auto"];
function randomVehicleType(): string {
  return weightedPick([
    ["Car", 45],
    ["Motorcycle", 35],
    ["Auto", 10],
    ["Bus", 5],
    ["Truck", 5],
  ]);
}

interface SeedCamera {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
  roadName: string;
  zone: string;
}

async function seedCameras(): Promise<SeedCamera[]> {
  const cameras: SeedCamera[] = [];
  let n = 0;
  for (let sector = 1; sector <= 5; sector++) {
    const camerasInSector = sector === 5 ? 10 : 5; // Sector V (IT hub) gets denser coverage
    for (let i = 0; i < camerasInSector; i++) {
      n += 1;
      const junction = JUNCTIONS[(n - 1) % JUNCTIONS.length];
      const road = ROAD_NAMES[(n * 3) % ROAD_NAMES.length];
      const code = `SEC${sector}-JN-CAM-${String(n).padStart(3, "0")}`;
      const lat = BASE_LAT + (sector - 3) * 0.012 + (Math.random() - 0.5) * 0.01;
      const lng = BASE_LNG + (i - camerasInSector / 2) * 0.008 + (Math.random() - 0.5) * 0.008;
      const status = Math.random() > 0.94 ? "offline" : Math.random() > 0.9 ? "degraded" : "online";

      const created = await prisma.camera.create({
        data: {
          code,
          name: `${junction} Camera`,
          lat,
          lng,
          roadName: road,
          zone: `Sector ${sector}`,
          directionFacing: ["North", "South", "East", "West"][randInt(0, 3)],
          status: status as any,
          installedAt: new Date(Date.now() - randInt(30, 400) * 86400000),
        },
      });
      cameras.push({ id: created.id, code, name: created.name, lat, lng, roadName: road, zone: created.zone });
    }
  }
  return cameras;
}

const now = new Date();
const DAYS_BACK = 3;

function jitterMinutes(base: Date, spread: number): Date {
  return new Date(base.getTime() + (Math.random() - 0.5) * spread * 60000);
}

interface Trail {
  plate: string;
  cameraId: string;
  detectedAt: Date;
  vehicleType: string;
  speedEstimateKmph: number | null;
}

async function main() {
  console.log("Seeding cameras...");
  const cameras = await seedCameras();

  console.log("Seeding users...");
  await prisma.user.createMany({
    data: [
      {
        email: "admin@trajectorytitans.local",
        passwordHash: await bcrypt.hash("admin123", 10),
        name: "Admin Operator",
        role: "admin",
      },
      {
        email: "operator@trajectorytitans.local",
        passwordHash: await bcrypt.hash("operator123", 10),
        name: "Duty Operator",
        role: "operator",
      },
    ],
  });

  const trails: Trail[] = [];

  // ---- Commuter vehicles: repeated morning/evening routes across 3 days ----
  console.log("Generating commuter trajectories...");
  const NUM_COMMUTERS = 40;
  for (let c = 0; c < NUM_COMMUTERS; c++) {
    const plate = randomPlate();
    const vehicleType = randomVehicleType();
    const routeLength = randInt(3, 5);
    const startIdx = randInt(0, cameras.length - 1);
    const route: SeedCamera[] = [cameras[startIdx]];
    // build a route by repeatedly hopping to a geographically nearby camera
    for (let i = 1; i < routeLength; i++) {
      const prev = route[route.length - 1];
      const next = [...cameras]
        .filter((cam) => !route.includes(cam))
        .sort(
          (a, b) =>
            estimateRoadDistanceKm(prev, a) - estimateRoadDistanceKm(prev, b),
        )[randInt(0, 2)];
      if (next) route.push(next);
    }

    for (let day = DAYS_BACK - 1; day >= 0; day--) {
      const dayStart = new Date(now.getTime() - day * 86400000);

      // Morning commute ~8:00-10:00
      const morningStart = new Date(dayStart);
      morningStart.setHours(8, randInt(0, 59), 0, 0);
      let t = jitterMinutes(morningStart, 20);
      for (const cam of route) {
        trails.push({
          plate,
          cameraId: cam.id,
          detectedAt: new Date(t),
          vehicleType,
          speedEstimateKmph: randInt(18, 45),
        });
        t = new Date(t.getTime() + randInt(4, 12) * 60000);
      }

      // Evening return ~17:30-19:30, reverse route
      const eveningStart = new Date(dayStart);
      eveningStart.setHours(17, 30 + randInt(0, 59), 0, 0);
      let t2 = jitterMinutes(eveningStart, 25);
      for (const cam of [...route].reverse()) {
        trails.push({
          plate,
          cameraId: cam.id,
          detectedAt: new Date(t2),
          vehicleType,
          speedEstimateKmph: randInt(12, 38), // evening traffic, slower
        });
        t2 = new Date(t2.getTime() + randInt(4, 14) * 60000);
      }
    }
  }

  // ---- Random background traffic ----
  console.log("Generating background traffic...");
  const NUM_RANDOM_VEHICLES = 220;
  for (let v = 0; v < NUM_RANDOM_VEHICLES; v++) {
    const plate = randomPlate();
    const vehicleType = randomVehicleType();
    const numSightings = randInt(1, 4);
    for (let s = 0; s < numSightings; s++) {
      const cam = cameras[randInt(0, cameras.length - 1)];
      const dayOffset = randInt(0, DAYS_BACK - 1);
      const dt = new Date(now.getTime() - dayOffset * 86400000);
      dt.setHours(randInt(0, 23), randInt(0, 59), 0, 0);
      trails.push({
        plate,
        cameraId: cam.id,
        detectedAt: dt,
        vehicleType,
        speedEstimateKmph: randInt(10, 55),
      });
    }
  }

  // ---- Blacklisted vehicles ----
  console.log("Seeding blacklisted vehicles + watchlist + alerts...");
  const blacklistReasons = [
    "Reported stolen — FIR #KOL/2026/4471",
    "Linked to hit-and-run case #SLC/2026/0892",
    "Wanted in connection with theft investigation",
    "Flagged by traffic police — expired registration + prior violations",
    "Suspected involvement in smuggling case, under surveillance",
  ];
  const blacklistPlates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const plate = randomPlate();
    blacklistPlates.push(plate);
    const vehicleType = randomVehicleType();

    await prisma.watchlist.create({
      data: {
        plateText: plate,
        reason: blacklistReasons[i],
        addedBy: "admin@trajectorytitans.local",
        active: true,
      },
    });

    // A couple of older sightings, plus one recent (within last hour) so it
    // reads as "live" the moment the app opens.
    const cam1 = cameras[randInt(0, cameras.length - 1)];
    const cam2 = cameras[randInt(0, cameras.length - 1)];
    trails.push({
      plate,
      cameraId: cam1.id,
      detectedAt: new Date(now.getTime() - randInt(2, 20) * 3600000),
      vehicleType,
      speedEstimateKmph: randInt(20, 50),
    });
    trails.push({
      plate,
      cameraId: cam2.id,
      detectedAt: new Date(now.getTime() - randInt(2, 45) * 60000),
      vehicleType,
      speedEstimateKmph: randInt(20, 50),
    });
  }

  // ---- Persist detections + vehicles ----
  console.log(`Persisting ${trails.length} detections...`);
  trails.sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime());

  const vehicleCache = new Map<string, { id: string }>();
  const createdDetections: { id: string; plateText: string; cameraId: string; detectedAt: Date }[] = [];

  for (const trail of trails) {
    let vehicle = vehicleCache.get(trail.plate);
    if (!vehicle) {
      vehicle = await prisma.vehicle.upsert({
        where: { plateText: trail.plate },
        create: {
          plateText: trail.plate,
          firstSeenAt: trail.detectedAt,
          lastSeenAt: trail.detectedAt,
          vehicleType: trail.vehicleType,
          isBlacklisted: blacklistPlates.includes(trail.plate),
          blacklistReason: blacklistPlates.includes(trail.plate)
            ? blacklistReasons[blacklistPlates.indexOf(trail.plate)]
            : null,
        },
        update: {},
      });
      vehicleCache.set(trail.plate, vehicle);
    } else {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { lastSeenAt: trail.detectedAt },
      });
    }

    const detection = await prisma.detection.create({
      data: {
        cameraId: trail.cameraId,
        vehicleId: vehicle.id,
        plateText: trail.plate,
        plateTextRaw: trail.plate,
        confidenceScore: Math.round((0.82 + Math.random() * 0.17) * 100) / 100,
        detectedAt: trail.detectedAt,
        vehicleType: trail.vehicleType,
        speedEstimateKmph: trail.speedEstimateKmph,
      },
    });
    createdDetections.push({
      id: detection.id,
      plateText: detection.plateText,
      cameraId: detection.cameraId,
      detectedAt: detection.detectedAt,
    });
  }

  // ---- Alerts for blacklisted plates' most recent sighting ----
  console.log("Creating alerts for blacklisted plates...");
  for (const plate of blacklistPlates) {
    const hits = createdDetections.filter((d) => d.plateText === plate).sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
    );
    const latest = hits[0];
    if (!latest) continue;
    const vehicle = vehicleCache.get(plate)!;
    await prisma.alert.create({
      data: {
        type: "blacklist_match",
        plateText: plate,
        vehicleId: vehicle.id,
        detectionId: latest.id,
        cameraId: latest.cameraId,
        severity: "critical",
        message: `Watchlisted vehicle ${plate} detected — ${
          blacklistReasons[blacklistPlates.indexOf(plate)]
        }`,
        status: Math.random() > 0.5 ? "open" : "acknowledged",
      },
    });
  }

  // ---- Pre-compute traffic aggregates (5-min buckets) ----
  console.log("Computing traffic aggregates...");
  const bucketMap = new Map<string, { cameraId: string; bucketStart: Date; speeds: number[]; count: number }>();
  for (const trail of trails) {
    const bucketStart = new Date(Math.floor(trail.detectedAt.getTime() / 300000) * 300000);
    const key = `${trail.cameraId}|${bucketStart.toISOString()}`;
    if (!bucketMap.has(key)) bucketMap.set(key, { cameraId: trail.cameraId, bucketStart, speeds: [], count: 0 });
    const b = bucketMap.get(key)!;
    b.count += 1;
    if (trail.speedEstimateKmph) b.speeds.push(trail.speedEstimateKmph);
  }
  for (const b of bucketMap.values()) {
    const avgSpeedKmph = b.speeds.length ? b.speeds.reduce((a, c) => a + c, 0) / b.speeds.length : 35;
    const congestionScore = Math.max(0, Math.min(100, 100 - avgSpeedKmph * 1.5));
    await prisma.trafficAggregate.create({
      data: {
        cameraId: b.cameraId,
        bucketStart: b.bucketStart,
        bucketSizeMinutes: 5,
        vehicleCount: b.count,
        avgSpeedKmph,
        congestionScore,
      },
    });
  }

  // ---- Pre-compute OD matrix (hourly buckets) from commuter trails ----
  console.log("Computing OD matrix...");
  const byPlate = new Map<string, Trail[]>();
  for (const t of trails) {
    if (!byPlate.has(t.plate)) byPlate.set(t.plate, []);
    byPlate.get(t.plate)!.push(t);
  }
  const odMap = new Map<
    string,
    { originCameraId: string; destinationCameraId: string; bucketStart: Date; travelTimes: number[] }
  >();
  const cameraById = new Map(cameras.map((c) => [c.id, c]));
  for (const trail of byPlate.values()) {
    trail.sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime());
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      const durationSeconds = (b.detectedAt.getTime() - a.detectedAt.getTime()) / 1000;
      if (durationSeconds <= 0 || durationSeconds > 3 * 3600) continue;
      const camA = cameraById.get(a.cameraId)!;
      const camB = cameraById.get(b.cameraId)!;
      const distanceKm = estimateRoadDistanceKm(camA, camB);
      if (speedKmph(distanceKm, durationSeconds) > 140) continue;
      const bucketStart = new Date(Math.floor(a.detectedAt.getTime() / 3600000) * 3600000);
      const key = `${a.cameraId}|${b.cameraId}|${bucketStart.toISOString()}`;
      if (!odMap.has(key)) {
        odMap.set(key, { originCameraId: a.cameraId, destinationCameraId: b.cameraId, bucketStart, travelTimes: [] });
      }
      odMap.get(key)!.travelTimes.push(durationSeconds);
    }
  }
  for (const od of odMap.values()) {
    const avgTravelTimeSeconds = od.travelTimes.reduce((a, c) => a + c, 0) / od.travelTimes.length;
    await prisma.oDMatrixEntry.create({
      data: {
        originCameraId: od.originCameraId,
        destinationCameraId: od.destinationCameraId,
        bucketStart: od.bucketStart,
        tripCount: od.travelTimes.length,
        avgTravelTimeSeconds,
      },
    });
  }

  console.log("Seed complete.");
  console.log(`  Cameras:    ${cameras.length}`);
  console.log(`  Vehicles:   ${vehicleCache.size}`);
  console.log(`  Detections: ${createdDetections.length}`);
  console.log(`  Blacklist:  ${blacklistPlates.join(", ")}`);
  console.log(`  Login:      admin@trajectorytitans.local / admin123`);
  console.log(`              operator@trajectorytitans.local / operator123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
