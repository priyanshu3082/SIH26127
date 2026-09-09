import { Controller, Get, Query } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get("city-stats")
  cityStats() {
    return this.analytics.cityStats();
  }

  @Get("heatmap")
  heatmap(@Query("from") from?: string, @Query("to") to?: string) {
    return this.analytics.heatmap(from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get("od-matrix")
  odMatrix(@Query("from") from?: string, @Query("to") to?: string) {
    return this.analytics.odMatrix(from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }
}
