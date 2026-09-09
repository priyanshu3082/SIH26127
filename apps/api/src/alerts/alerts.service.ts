import { Injectable } from "@nestjs/common";
import { Detection, Vehicle } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { estimateRoadDistanceKm, speedKmph } from "../common/geo";

// A car doing more than this on a real urban road is not physically plausible —
// two sightings faster than this apart get flagged as a route/speed anomaly
// instead of accepted as a normal same-vehicle transition.
const IMPLAUSIBLE_SPEED_KMPH = 140;

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  list(params: { status?: string; limit?: number }) {
    return this.prisma.alert.findMany({
      where: { status: params.status as any },
      include: { camera: true },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 100,
    });
  }

  async acknowledge(id: string, by: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { status: "acknowledged", acknowledgedBy: by, acknowledgedAt: new Date() },
    });
  }

  async resolve(id: string) {
    return this.prisma.alert.update({ where: { id }, data: { status: "resolved" } });
  }

  /** Runs the two real-time detection rules from brief section 4.4:
   *  1. blacklist_match — plate is on an active watchlist entry.
   *  2. route_anomaly / speed_anomaly — the gap between this and the vehicle's
   *     previous sighting implies a physically implausible speed.
   * Called synchronously from the detection ingest path (in place of a Kafka
   * consumer) so alerts fire within the same request that persists the
   * detection. */
  async evaluateForDetection(detection: Detection, vehicle: Vehicle) {
    const created: Awaited<ReturnType<PrismaService["alert"]["create"]>>[] = [];

    const watchHit = await this.prisma.watchlist.findFirst({
      where: {
        plateText: detection.plateText,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (watchHit) {
      const alert = await this.prisma.alert.create({
        data: {
          type: "blacklist_match",
          plateText: detection.plateText,
          vehicleId: vehicle.id,
          detectionId: detection.id,
          cameraId: detection.cameraId,
          severity: "critical",
          message: `Watchlisted vehicle ${detection.plateText} detected — ${watchHit.reason}`,
          status: "open",
        },
        include: { camera: true },
      });
      created.push(alert);
    }

    const previous = await this.prisma.detection.findFirst({
      where: { plateText: detection.plateText, id: { not: detection.id } },
      orderBy: { detectedAt: "desc" },
      include: { camera: true },
    });

    if (previous) {
      const thisCamera = await this.prisma.camera.findUnique({ where: { id: detection.cameraId } });
      if (thisCamera && previous.camera) {
        const durationSeconds =
          (detection.detectedAt.getTime() - previous.detectedAt.getTime()) / 1000;
        if (durationSeconds > 0) {
          const distanceKm = estimateRoadDistanceKm(previous.camera, thisCamera);
          const impliedSpeed = speedKmph(distanceKm, durationSeconds);
          if (impliedSpeed > IMPLAUSIBLE_SPEED_KMPH) {
            const alert = await this.prisma.alert.create({
              data: {
                type: "route_anomaly",
                plateText: detection.plateText,
                vehicleId: vehicle.id,
                detectionId: detection.id,
                cameraId: detection.cameraId,
                severity: "medium",
                message: `${detection.plateText} implies ${impliedSpeed.toFixed(0)} km/h between ${previous.camera.code} and ${thisCamera.code} — physically implausible`,
                status: "open",
              },
              include: { camera: true },
            });
            created.push(alert);
          }
        }
      }
    }

    return created;
  }
}
