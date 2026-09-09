"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, ShieldAlert, ListChecks, Radar, Info } from "lucide-react";
import { cn } from "@sih/ui";
import { useAlerts, useWatchlist } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "City Map", icon: LayoutDashboard },
  { href: "/trajectory", label: "Track Vehicle", icon: Route },
  { href: "/alerts", label: "Alerts", icon: ShieldAlert, countKey: "alerts" as const },
  { href: "/watchlist", label: "Watchlist", icon: ListChecks, countKey: "watchlist" as const },
  { href: "/about", label: "About", icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: openAlerts } = useAlerts("open");
  const { data: watchlist } = useWatchlist();

  const counts: Record<string, { value: number; urgent?: boolean } | undefined> = {
    alerts: openAlerts ? { value: openAlerts.length, urgent: openAlerts.length > 0 } : undefined,
    watchlist: watchlist ? { value: watchlist.filter((w) => w.active).length } : undefined,
  };

  return (
    <aside className="flex w-16 flex-col border-r border-border-subtle bg-bg-1 py-4 lg:w-56">
      <div className="mb-6 flex items-center gap-2 px-3 lg:px-4">
        <Radar className="h-6 w-6 shrink-0 text-cyan-400" />
        <div className="hidden lg:block">
          <p className="font-display text-sm font-bold leading-tight text-text-primary">Trajectory Titans</p>
          <p className="font-mono text-[10px] leading-tight text-text-muted">SIH26127 · BEL</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const count = item.countKey ? counts[item.countKey] : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 py-2.5 pl-3 pr-3 font-display text-sm font-medium transition-colors duration-fast lg:pl-4",
                "justify-center lg:justify-start",
                active ? "text-cyan-300" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {active && <span className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r-full bg-cyan-400" />}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden flex-1 lg:inline">{item.label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    "hidden font-mono text-[11px] tabular-nums lg:inline",
                    count.urgent ? "text-red-400" : "text-text-disabled",
                  )}
                >
                  {count.value}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="hidden px-4 font-mono text-[10px] text-text-disabled lg:block">Smart Automation · BEL</div>
    </aside>
  );
}
