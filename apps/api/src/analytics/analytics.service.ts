import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { estimateRoadDistanceKm, speedKmph } from "../common/geo";

const AGGREGATE_BUCKET_MINUTES = 5;
const IMPLAUSIBLE_SPEED_KMPH = 140;

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async cityStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalDetectionsToday, activeAlerts, cameras, avgSpeedAgg, busiest] = await Promise.all([
      this.prisma.detection.count({ where: { detectedAt: { gte: startOfDay } } }),
      this.prisma.alert.count({ where: { status: "open" } }),
      this.prisma.camera.findMany(),
      this.prisma.trafficAggregate.aggregate({ _avg: { avgSpeedKmph: true } }),
      this.prisma.trafficAggregate.groupBy({
        by: ["cameraId"],
        _sum: { vehicleCount: true },
        orderBy: { _sum: { vehicleCount: "desc" } },
        take: 1,
      }),
    ]);

    let busiestCorridor = "—";
    if (busiest[0]) {
      const cam = await this.prisma.camera.findUnique({ where: { id: busiest[0].cameraId } });
      busiestCorridor = cam?.roadName ?? "—";
    }

    return {
      totalDetectionsToday,
      activeAlerts,
      avgCitySpeedKmph: Math.round((avgSpeedAgg._avg.avgSpeedKmph ?? 0) * 10) / 10,
      busiestCorridor,
      onlineCameras: cameras.filter((c) => c.status === "online").length,
      totalCameras: cameras.length,
    };
  }

  async heatmap(from?: Date, to?: Date) {
    return this.prisma.trafficAggregate.findMany({
      where: { bucketStart: { gte: from, lte: to } },
      include: { camera: true },
    });
  }

  async odMatrix(from?: Date, to?: Date) {
    return this.prisma.oDMatrixEntry.findMany({
      where: { bucketStart: { gte: from, lte: to } },
      include: { originCamera: true, destinationCamera: true },
    });
  }

  /** Recomputes traffic_aggregates and od_matrix from raw detections for a
   * given bucket window. Runs from the in-process cron scheduler in place of
   * a BullMQ/Redis worker (no Redis in this build). */
  async recomputeAggregatesSince(since: Date) {
    const detections = await this.prisma.detection.findMany({
      where: { detectedAt: { gte: since } },
      include: { camera: true },
      orderBy: { detectedAt: "asc" },
    });

    const buckets = new Map<string, { cameraId: string; bucketStart: Date; speeds: number[]; count: number }>();

    for (const d of detections) {
      const bucketStart = floorToBucket(d.detectedAt, AGGREGATE_BUCKET_MINUTES);
      const key = `${d.cameraId}|${bucketStart.toISOString()}`;
      if (!buckets.has(key)) {
        buckets.set(key, { cameraId: d.cameraId, bucketStart, speeds: [], count: 0 });
      }
      const b = buckets.get(key)!;
      b.count += 1;
      if (d.speedEstimateKmph) b.speeds.push(d.speedEstimateKmph);
    }

    for (const b of buckets.values()) {
      const avgSpeedKmph = b.speeds.length ? b.speeds.reduce((a, c) => a + c, 0) / b.speeds.length : 35;
      const congestionScore = Math.max(0, Math.min(100, 100 - avgSpeedKmph * 1.5));
      await this.prisma.trafficAggregate.upsert({
        where: {
          cameraId_bucketStart_bucketSizeMinutes: {
            cameraId: b.cameraId,
            bucketStart: b.bucketStart,
            bucketSizeMinutes: AGGREGATE_BUCKET_MINUTES,
          },
        },
        create: {
          cameraId: b.cameraId,
          bucketStart: b.bucketStart,
          bucketSizeMinutes: AGGREGATE_BUCKET_MINUTES,
          vehicleCount: b.count,
          avgSpeedKmph,
          congestionScore,
        },
        update: { vehicleCount: b.count, avgSpeedKmph, congestionScore },
      });
    }

    // OD matrix: link consecutive detections of the same plate across camera
    // pairs within a plausible time window.
    const byPlate = new Map<string, typeof detections>();
    for (const d of detections) {
      if (!byPlate.has(d.plateText)) byPlate.set(d.plateText, []);
      byPlate.get(d.plateText)!.push(d);
    }

    const odBuckets = new Map<
      string,
      { originCameraId: string; destinationCameraId: string; bucketStart: Date; travelTimes: number[] }
    >();

    for (const trail of byPlate.values()) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const durationSeconds = (b.detectedAt.getTime() - a.detectedAt.getTime()) / 1000;
        if (durationSeconds <= 0) continue;
        const distanceKm = estimateRoadDistanceKm(a.camera, b.camera);
        if (speedKmph(distanceKm, durationSeconds) > IMPLAUSIBLE_SPEED_KMPH) continue;

        const bucketStart = floorToBucket(a.detectedAt, 60);
        const key = `${a.cameraId}|${b.cameraId}|${bucketStart.toISOString()}`;
        if (!odBuckets.has(key)) {
          odBuckets.set(key, {
            originCameraId: a.cameraId,
            destinationCameraId: b.cameraId,
            bucketStart,
            travelTimes: [],
          });
        }
        odBuckets.get(key)!.travelTimes.push(durationSeconds);
      }
    }

    for (const od of odBuckets.values()) {
      const avgTravelTimeSeconds = od.travelTimes.reduce((a, c) => a + c, 0) / od.travelTimes.length;
      await this.prisma.oDMatrixEntry.upsert({
        where: {
          originCameraId_destinationCameraId_bucketStart: {
            originCameraId: od.originCameraId,
            destinationCameraId: od.destinationCameraId,
            bucketStart: od.bucketStart,
          },
        },
        create: {
          originCameraId: od.originCameraId,
          destinationCameraId: od.destinationCameraId,
          bucketStart: od.bucketStart,
          tripCount: od.travelTimes.length,
          avgTravelTimeSeconds,
        },
        update: { tripCount: od.travelTimes.length, avgTravelTimeSeconds },
      });
    }
  }
}

function floorToBucket(date: Date, minutes: number): Date {
  const ms = minutes * 60 * 1000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}
