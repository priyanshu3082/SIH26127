import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { normalizePlate } from "../common/plates";

export interface CreateDetectionInput {
  cameraId: string;
  plateTextRaw: string;
  confidenceScore: number;
  detectedAt: Date;
  vehicleType: string;
  imageUrl?: string | null;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
  speedEstimateKmph?: number | null;
}

@Injectable()
export class DetectionsService {
  constructor(private prisma: PrismaService) {}

  async list(params: { plateText?: string; cameraId?: string; limit?: number }) {
    return this.prisma.detection.findMany({
      where: {
        plateText: params.plateText ? normalizePlate(params.plateText) : undefined,
        cameraId: params.cameraId,
      },
      include: { camera: true },
      orderBy: { detectedAt: "desc" },
      take: params.limit ?? 100,
    });
  }

  async recent(limit = 30) {
    return this.prisma.detection.findMany({
      include: { camera: true },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });
  }

  /** Creates a detection, upserts the owning Vehicle record (first/last seen,
   * blacklist flag lookup), and returns the fully-joined row. This is the single
   * ingestion path used by both the ml-service inference callback and the
   * demo replay simulator. */
  async create(input: CreateDetectionInput) {
    const plateText = normalizePlate(input.plateTextRaw);

    const vehicle = await this.prisma.vehicle.upsert({
      where: { plateText },
      create: {
        plateText,
        firstSeenAt: input.detectedAt,
        lastSeenAt: input.detectedAt,
        vehicleType: input.vehicleType,
      },
      update: {
        lastSeenAt: input.detectedAt,
      },
    });

    const detection = await this.prisma.detection.create({
      data: {
        cameraId: input.cameraId,
        vehicleId: vehicle.id,
        plateText,
        plateTextRaw: input.plateTextRaw,
        confidenceScore: input.confidenceScore,
        detectedAt: input.detectedAt,
        vehicleType: input.vehicleType,
        imageUrl: input.imageUrl ?? null,
        boundingBoxJson: input.boundingBox ? JSON.stringify(input.boundingBox) : null,
        speedEstimateKmph: input.speedEstimateKmph ?? null,
      },
      include: { camera: true },
    });

    return { detection, vehicle };
  }

  async knownPlates(query: string, limit = 8) {
    const normalized = normalizePlate(query);
    if (!normalized) return [];
    const vehicles = await this.prisma.vehicle.findMany({
      where: { plateText: { contains: normalized } },
      take: limit,
      orderBy: { lastSeenAt: "desc" },
    });
    return vehicles;
  }
}
