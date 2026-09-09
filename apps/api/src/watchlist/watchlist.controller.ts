import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { IsISO8601, IsOptional, IsString } from "class-validator";
import { WatchlistService } from "./watchlist.service";

class CreateWatchlistDto {
  @IsString() plateText!: string;
  @IsString() reason!: string;
  @IsString() addedBy!: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
}

@Controller("watchlist")
export class WatchlistController {
  constructor(private watchlist: WatchlistService) {}

  @Get()
  list() {
    return this.watchlist.list();
  }

  @Post()
  create(@Body() dto: CreateWatchlistDto) {
    return this.watchlist.create({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string) {
    return this.watchlist.deactivate(id);
  }
}
