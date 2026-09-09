import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { CamerasModule } from "./cameras/cameras.module";
import { DetectionsModule } from "./detections/detections.module";
import { TrajectoryModule } from "./trajectory/trajectory.module";
import { AlertsModule } from "./alerts/alerts.module";
import { WatchlistModule } from "./watchlist/watchlist.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { EventsModule } from "./events/events.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    EventsModule,
    CamerasModule,
    DetectionsModule,
    TrajectoryModule,
    AlertsModule,
    WatchlistModule,
    AnalyticsModule,
    AuthModule,
  ],
})
export class AppModule {}
