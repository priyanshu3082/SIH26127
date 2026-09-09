import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AnalyticsService } from "./analytics.service";

// Stands in for the brief's BullMQ/Redis background worker — an in-process
// cron job since there's no Redis in this build. Recomputes rolling
// aggregates from the last hour of detections every minute.
@Injectable()
export class AggregationScheduler {
  private readonly logger = new Logger(AggregationScheduler.name);

  constructor(private analytics: AnalyticsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    try {
      await this.analytics.recomputeAggregatesSince(since);
    } catch (err) {
      this.logger.error("Aggregate recomputation failed", err as Error);
    }
  }
}
