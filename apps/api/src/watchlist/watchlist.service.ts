import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { normalizePlate } from "../common/plates";

@Injectable()
export class WatchlistService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.watchlist.findMany({ orderBy: { addedAt: "desc" } });
  }

  create(input: { plateText: string; reason: string; addedBy: string; expiresAt?: Date | null }) {
    return this.prisma.watchlist.create({
      data: {
        plateText: normalizePlate(input.plateText),
        reason: input.reason,
        addedBy: input.addedBy,
        expiresAt: input.expiresAt ?? null,
        active: true,
      },
    });
  }

  deactivate(id: string) {
    return this.prisma.watchlist.update({ where: { id }, data: { active: false } });
  }
}
