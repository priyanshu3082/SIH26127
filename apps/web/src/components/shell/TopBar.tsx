"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Bell, Wifi, WifiOff } from "lucide-react";
import { Badge, AppToast } from "@sih/ui";
import { useAlerts } from "@/lib/api";
import { useLiveEvents } from "@/lib/socket";
import type { AlertWithContext } from "@sih/types";

const PAGE_TITLES: Record<string, string> = {
  "/": "City Traffic Overview",
  "/trajectory": "Vehicle Trajectory Reconstruction",
  "/alerts": "Alerts",
  "/watchlist": "Watchlist Management",
  "/about": "About This Solution",
};

interface ToastEntry {
  id: string;
  tone: "critical" | "warning" | "info";
  title: string;
  description: string;
}

function useClock() {
  // Starts null so server and first client render match (both show
  // nothing); the real clock only ever renders after mount, avoiding a
  // hydration mismatch from server-render time vs. client-mount time.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function TopBar() {
  const pathname = usePathname();
  const now = useClock();
  const { data: openAlerts } = useAlerts("open");
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);

  const { connected } = useLiveEvents({
    onAlert: (alert: AlertWithContext) => {
      const tone = alert.severity === "critical" ? "critical" : alert.severity === "medium" ? "warning" : "info";
      const entry: ToastEntry = {
        id: `${alert.id}-${Date.now()}`,
        tone,
        title: alert.type === "blacklist_match" ? "Watchlist match" : "Route anomaly detected",
        description: `${alert.plateText} · ${alert.camera.code}`,
      };
      setToasts((prev) => [entry, ...prev].slice(0, 4));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== entry.id));
      }, 7000);
    },
  });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-1 px-5">
        <h1 className="font-display text-md font-semibold text-text-primary">
          {PAGE_TITLES[pathname] ?? "Trajectory Titans"}
        </h1>

        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-muted">
            {now
              ? `${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${now.toLocaleTimeString("en-IN", { hour12: false })}`
              : " "}
          </span>

          <Badge tone={connected ? "green" : "red"} dot>
            {connected ? "Live" : "Offline"}
          </Badge>

          <a
            href="/alerts"
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-2 hover:text-text-primary"
          >
            <Bell className="h-4 w-4" />
            {!!openAlerts?.length && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[10px] font-bold text-bg-0">
                {openAlerts.length}
              </span>
            )}
          </a>
        </div>
      </header>

      {toasts.map((t) => (
        <AppToast
          key={t.id}
          tone={t.tone}
          title={t.title}
          description={t.description}
          onOpenChange={(open) => {
            if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
          }}
        />
      ))}
    </>
  );
}
