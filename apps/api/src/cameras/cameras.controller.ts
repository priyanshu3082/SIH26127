import { Controller, Get, Param } from "@nestjs/common";
import { CamerasService } from "./cameras.service";

@Controller("cameras")
export class CamerasController {
  constructor(private cameras: CamerasService) {}

  @Get()
  findAll() {
    return this.cameras.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.cameras.findOne(id);
  }
}
