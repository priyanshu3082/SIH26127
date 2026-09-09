import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AggregationScheduler } from "./aggregation.scheduler";

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AggregationScheduler],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
