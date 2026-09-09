import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CamerasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.camera.findMany({ orderBy: { code: "asc" } });
  }

  findOne(id: string) {
    return this.prisma.camera.findUnique({ where: { id } });
  }

  async setStatus(id: string, status: "online" | "offline" | "degraded") {
    return this.prisma.camera.update({ where: { id }, data: { status } });
  }
}
