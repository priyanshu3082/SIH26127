import { Controller, Get, Query } from "@nestjs/common";
import { TrajectoryService } from "./trajectory.service";

@Controller("trajectory")
export class TrajectoryController {
  constructor(private trajectory: TrajectoryService) {}

  @Get()
  reconstruct(
    @Query("plate") plate: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.trajectory.reconstruct(plate, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }
}
