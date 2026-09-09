"use client";

import * as React from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Check, CheckCheck } from "lucide-react";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState, cn } from "@sih/ui";
import type { AlertSeverity, AlertWithContext } from "@sih/types";
import { ShieldAlert } from "lucide-react";
import { formatPlateDisplay } from "@/lib/plates";

const severityColor: Record<AlertSeverity, string> = {
  critical: "text-red-400",
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-text-secondary",
};

const severityDot: Record<AlertSeverity, string> = {
  critical: "bg-red-400",
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-text-disabled",
};

const typeLabel: Record<string, string> = {
  blacklist_match: "Watchlist Match",
  route_anomaly: "Route Anomaly",
  speed_anomaly: "Speed Anomaly",
};

const columnHelper = createColumnHelper<AlertWithContext>();

export interface AlertsTableProps {
  alerts: AlertWithContext[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  busyId?: string | null;
}

export function AlertsTable({ alerts, onAcknowledge, onResolve, busyId }: AlertsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }]);

  const columns = React.useMemo(
    () => [
      columnHelper.accessor("severity", {
        header: "Severity",
        cell: (info) => {
          const severity = info.getValue();
          return (
            <span className={cn("flex items-center gap-1.5 font-mono text-xs uppercase", severityColor[severity])}>
              <span className={cn("h-1.5 w-1.5 rounded-full", severityDot[severity])} />
              {severity}
            </span>
          );
        },
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => <span className="text-text-secondary">{typeLabel[info.getValue()] ?? info.getValue()}</span>,
      }),
      columnHelper.accessor("plateText", {
        header: "Plate",
        cell: (info) => <span className="font-semibold text-cyan-300">{formatPlateDisplay(info.getValue())}</span>,
      }),
      columnHelper.accessor((row) => row.camera.code, {
        id: "camera",
        header: "Camera",
      }),
      columnHelper.accessor("message", {
        header: "Details",
        cell: (info) => (
          <span className="block max-w-md truncate text-text-secondary" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Time",
        cell: (info) => new Date(info.getValue()).toLocaleTimeString("en-IN", { hour12: false }),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          return (
            <span
              className={cn(
                "flex items-center gap-1.5 font-mono text-xs",
                status === "open" ? "text-red-400" : status === "acknowledged" ? "text-amber-400" : "text-text-muted",
              )}
            >
              {status === "open" && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
              {status}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const alert = info.row.original;
          if (alert.status === "resolved") return null;
          const isBusy = busyId === alert.id;
          return (
            <div className="flex justify-end gap-1.5">
              {alert.status === "open" && (
                <Button variant="outline" size="sm" disabled={isBusy} onClick={() => onAcknowledge(alert.id)}>
                  <Check className="h-3 w-3" /> Acknowledge
                </Button>
              )}
              <Button variant="secondary" size="sm" disabled={isBusy} onClick={() => onResolve(alert.id)}>
                <CheckCheck className="h-3 w-3" /> Resolve
              </Button>
            </div>
          );
        },
      }),
    ],
    [busyId, onAcknowledge, onResolve],
  );

  const table = useReactTable({
    data: alerts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!alerts.length) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="No alerts match this filter"
          description="Blacklist matches and route anomalies will appear here the moment they're detected."
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : (
                  <button
                    type="button"
                    className="flex items-center gap-1 disabled:cursor-default"
                    disabled={!header.column.getCanSort()}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </button>
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          const isOpen = row.original.status === "open";
          return (
            <TableRow
              key={row.id}
              className={cn("border-l-2", isOpen ? "border-l-red-500 bg-red-500/[0.03]" : "border-l-transparent")}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
