"use client";

import { Ban, ListChecks } from "lucide-react";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, EmptyState, cn } from "@sih/ui";
import type { WatchlistEntry } from "@sih/types";
import { formatPlateDisplay } from "@/lib/plates";

export interface WatchlistTableProps {
  entries: WatchlistEntry[];
  onDeactivate: (id: string) => void;
  busyId?: string | null;
}

export function WatchlistTable({ entries, onDeactivate, busyId }: WatchlistTableProps) {
  if (!entries.length) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="Watchlist is empty"
          description="Add a plate above to start flagging it on sight."
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plate</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Added By</TableHead>
          <TableHead>Added</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-semibold text-cyan-300">{formatPlateDisplay(entry.plateText)}</TableCell>
            <TableCell className="max-w-sm truncate text-text-secondary" title={entry.reason}>
              {entry.reason}
            </TableCell>
            <TableCell className="text-text-secondary">{entry.addedBy}</TableCell>
            <TableCell className="text-text-secondary">
              {new Date(entry.addedAt).toLocaleDateString("en-IN")}
            </TableCell>
            <TableCell className="text-text-secondary">
              {entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString("en-IN") : "—"}
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  "flex items-center gap-1.5 font-mono text-xs",
                  entry.active ? "text-green-400" : "text-text-disabled",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", entry.active ? "bg-green-400" : "bg-text-disabled")} />
                {entry.active ? "Active" : "Inactive"}
              </span>
            </TableCell>
            <TableCell>
              {entry.active && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === entry.id}
                  onClick={() => onDeactivate(entry.id)}
                >
                  <Ban className="h-3 w-3" /> Deactivate
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
