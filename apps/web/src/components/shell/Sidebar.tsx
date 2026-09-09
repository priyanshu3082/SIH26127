"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, ShieldAlert, ListChecks, Radar } from "lucide-react";
import { cn } from "@sih/ui";

const NAV_ITEMS = [
  { href: "/", label: "City Map", icon: LayoutDashboard },
  { href: "/trajectory", label: "Track Vehicle", icon: Route },
  { href: "/alerts", label: "Alerts", icon: ShieldAlert },
  { href: "/watchlist", label: "Watchlist", icon: ListChecks },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-16 flex-col items-center border-r border-border-subtle bg-bg-1 py-4 lg:w-56 lg:items-stretch lg:px-3">
      <div className="mb-6 flex items-center gap-2 px-1 lg:px-2">
        <Radar className="h-6 w-6 shrink-0 text-cyan-400" />
        <div className="hidden lg:block">
          <p className="font-display text-sm font-bold leading-tight text-text-primary">Trajectory Titans</p>
          <p className="font-mono text-[10px] leading-tight text-text-muted">SIH26127 · BEL</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 font-display text-sm font-medium transition-colors duration-fast",
                "justify-center lg:justify-start",
                active
                  ? "bg-bg-3 text-cyan-400"
                  : "text-text-secondary hover:bg-bg-2 hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden px-2 font-mono text-[10px] text-text-disabled lg:block">
        Smart Automation · BEL
      </div>
    </aside>
  );
}
