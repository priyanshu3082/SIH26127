import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { estimateRoadDistanceKm, speedKmph } from "../common/geo";
import { levenshtein, normalizePlate } from "../common/plates";

// A single-character OCR misread ("0"<->"O", "8"<->"B") is still "the same
// plate" for search purposes; anything further apart is treated as a
// different vehicle.
const FUZZY_MATCH_MAX_DISTANCE = 1;
const IMPLAUSIBLE_SPEED_KMPH = 140;

@Injectable()
export class TrajectoryService {
  constructor(private prisma: PrismaService) {}

  /** Given a plate (possibly OCR-noisy) and an optional time window, finds the
   * best-matching known plate, pulls its ordered detections, and reconstructs
   * a route with per-segment distance/duration/speed and a plausibility flag —
   * the brief's "Trajectory Reconstruction Engine" (section 4.2). */
  async reconstruct(rawPlate: string, from?: Date, to?: Date) {
    const query = normalizePlate(rawPlate);

    const exact = await this.prisma.vehicle.findUnique({ where: { plateText: query } });
    let plateText = exact?.plateText;

    if (!plateText) {
      const candidates = await this.prisma.vehicle.findMany({ take: 500 });
      let best: { plateText: string; dist: number } | null = null;
      for (const c of candidates) {
        const d = levenshtein(query, c.plateText);
        if (d <= FUZZY_MATCH_MAX_DISTANCE && (!best || d < best.dist)) {
          best = { plateText: c.plateText, dist: d };
        }
      }
      plateText = best?.plateText;
    }

    if (!plateText) {
      throw new NotFoundException(`No known vehicle matching plate "${rawPlate}"`);
    }

    const detections = await this.prisma.detection.findMany({
      where: {
        plateText,
        detectedAt: { gte: from, lte: to },
      },
      include: { camera: true },
      orderBy: { detectedAt: "asc" },
    });

    const segments: {
      fromDetection: (typeof detections)[number];
      toDetection: (typeof detections)[number];
      distanceKm: number;
      durationSeconds: number;
      avgSpeedKmph: number;
      plausible: boolean;
    }[] = [];
    let totalDistanceKm = 0;
    let totalDurationSeconds = 0;

    for (let i = 1; i < detections.length; i++) {
      const a = detections[i - 1];
      const b = detections[i];
      const distanceKm = estimateRoadDistanceKm(a.camera, b.camera);
      const durationSeconds = (b.detectedAt.getTime() - a.detectedAt.getTime()) / 1000;
      const avgSpeedKmph = speedKmph(distanceKm, durationSeconds);
      segments.push({
        fromDetection: a,
        toDetection: b,
        distanceKm,
        durationSeconds,
        avgSpeedKmph,
        plausible: avgSpeedKmph <= IMPLAUSIBLE_SPEED_KMPH,
      });
      totalDistanceKm += distanceKm;
      totalDurationSeconds += durationSeconds;
    }

    return {
      plateText,
      queriedAs: rawPlate,
      detections,
      segments,
      totalDistanceKm,
      totalDurationSeconds,
    };
  }
}
