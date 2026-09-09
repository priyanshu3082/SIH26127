import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsIn, IsISO8601, IsNumber, IsObject, IsOptional, IsString, Max, Min } from "class-validator";
import { DetectionsService } from "./detections.service";
import { AlertsService } from "../alerts/alerts.service";
import { EventsGateway } from "../events/events.gateway";

class BoundingBoxDto {
  @IsNumber() x!: number;
  @IsNumber() y!: number;
  @IsNumber() width!: number;
  @IsNumber() height!: number;
}

class IngestDetectionDto {
  @IsString() cameraId!: string;
  @IsString() plateTextRaw!: string;
  @IsNumber() @Min(0) @Max(1) confidenceScore!: number;
  @IsOptional() @IsISO8601() detectedAt?: string;
  @IsIn(["Car", "Motorcycle", "Bus", "Truck", "Auto", "Unknown"]) vehicleType!: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsObject() boundingBox?: BoundingBoxDto;
  @IsOptional() @IsNumber() speedEstimateKmph?: number;
}

@Controller("detections")
export class DetectionsController {
  constructor(
    private detections: DetectionsService,
    private alerts: AlertsService,
    private events: EventsGateway,
  ) {}

  @Get()
  list(
    @Query("plateText") plateText?: string,
    @Query("cameraId") cameraId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.detections.list({ plateText, cameraId, limit: limit ? Number(limit) : undefined });
  }

  @Get("recent")
  recent(@Query("limit") limit?: string) {
    return this.detections.recent(limit ? Number(limit) : undefined);
  }

  @Get("known-plates")
  knownPlates(@Query("q") q: string) {
    return this.detections.knownPlates(q ?? "");
  }

  /** Single ingestion entrypoint for both the ml-service inference pipeline and
   * the local demo replay simulator. Standing in for the brief's Kafka
   * `plate.detections` topic: this handler is the "consumer fan-out" — it
   * persists the detection, evaluates watchlist/anomaly rules, and pushes both
   * over WebSocket, all in one place so a real broker can be dropped in later
   * without changing callers. */
  @Post()
  async ingest(@Body() dto: IngestDetectionDto) {
    const { detection, vehicle } = await this.detections.create({
      cameraId: dto.cameraId,
      plateTextRaw: dto.plateTextRaw,
      confidenceScore: dto.confidenceScore,
      detectedAt: dto.detectedAt ? new Date(dto.detectedAt) : new Date(),
      vehicleType: dto.vehicleType,
      imageUrl: dto.imageUrl,
      boundingBox: dto.boundingBox,
      speedEstimateKmph: dto.speedEstimateKmph,
    });

    this.events.emitDetection(detection as any);

    const newAlerts = await this.alerts.evaluateForDetection(detection, vehicle);
    for (const alert of newAlerts) {
      this.events.emitAlert(alert as any);
    }

    return { detection, alerts: newAlerts };
  }
}
