import { Module } from "@nestjs/common";
import { DetectionsController } from "./detections.controller";
import { DetectionsService } from "./detections.service";
import { AlertsModule } from "../alerts/alerts.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [AlertsModule, EventsModule],
  controllers: [DetectionsController],
  providers: [DetectionsService],
  exports: [DetectionsService],
})
export class DetectionsModule {}
