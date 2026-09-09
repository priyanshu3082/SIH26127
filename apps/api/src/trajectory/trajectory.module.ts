import { Module } from "@nestjs/common";
import { TrajectoryController } from "./trajectory.controller";
import { TrajectoryService } from "./trajectory.service";

@Module({
  controllers: [TrajectoryController],
  providers: [TrajectoryService],
})
export class TrajectoryModule {}
