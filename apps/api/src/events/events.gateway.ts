import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Injectable } from "@nestjs/common";

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"] },
})
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  emitDetection(detection: unknown) {
    this.server?.emit("detection:new", detection);
  }

  emitAlert(alert: unknown) {
    this.server?.emit("alert:new", alert);
  }

  emitAlertUpdated(alert: unknown) {
    this.server?.emit("alert:updated", alert);
  }

  emitCameraStatus(payload: { cameraId: string; status: string }) {
    this.server?.emit("camera:status", payload);
  }
}
