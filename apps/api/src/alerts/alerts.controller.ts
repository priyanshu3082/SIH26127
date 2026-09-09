import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { AlertsService } from "./alerts.service";
import { EventsGateway } from "../events/events.gateway";

@Controller("alerts")
export class AlertsController {
  constructor(private alerts: AlertsService, private events: EventsGateway) {}

  @Get()
  list(@Query("status") status?: string, @Query("limit") limit?: string) {
    return this.alerts.list({ status, limit: limit ? Number(limit) : undefined });
  }

  @Patch(":id/acknowledge")
  async acknowledge(@Param("id") id: string, @Body("by") by: string) {
    const alert = await this.alerts.acknowledge(id, by ?? "operator");
    this.events.emitAlertUpdated(alert);
    return alert;
  }

  @Patch(":id/resolve")
  async resolve(@Param("id") id: string) {
    const alert = await this.alerts.resolve(id);
    this.events.emitAlertUpdated(alert);
    return alert;
  }
}
