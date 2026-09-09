"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import type { AlertWithContext, DetectionWithCamera, ServerToClientEvents } from "@sih/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

let socketSingleton: Socket<ServerToClientEvents> | null = null;

function getSocket() {
  if (!socketSingleton) {
    socketSingleton = io(WS_URL, { transports: ["websocket"], autoConnect: true });
  }
  return socketSingleton;
}

export interface LiveEventHandlers {
  onDetection?: (detection: DetectionWithCamera) => void;
  onAlert?: (alert: AlertWithContext) => void;
}

/** Subscribes to the live detection/alert WebSocket stream (the brief's
 * "Kafka topic fan-out", delivered here over Socket.IO instead) and keeps
 * React Query's cameras/detections/alerts/city-stats views fresh as events
 * arrive, in addition to firing the optional callbacks (e.g. toast on
 * alert). */
export function useLiveEvents(handlers: LiveEventHandlers = {}) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = React.useState(false);
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;

  React.useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onDetectionNew = (detection: DetectionWithCamera) => {
      queryClient.invalidateQueries({ queryKey: ["detections", "recent"] });
      queryClient.invalidateQueries({ queryKey: ["city-stats"] });
      handlersRef.current.onDetection?.(detection);
    };

    const onAlertNew = (alert: AlertWithContext) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["city-stats"] });
      handlersRef.current.onAlert?.(alert);
    };

    const onAlertUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["city-stats"] });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("detection:new", onDetectionNew);
    socket.on("alert:new", onAlertNew);
    socket.on("alert:updated", onAlertUpdated);
    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("detection:new", onDetectionNew);
      socket.off("alert:new", onAlertNew);
      socket.off("alert:updated", onAlertUpdated);
    };
  }, [queryClient]);

  return { connected };
}
