"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@sih/ui";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { AddWatchlistModal } from "@/components/watchlist/AddWatchlistModal";
import { useWatchlist, createWatchlistEntry, deactivateWatchlistEntry } from "@/lib/api";

export default function WatchlistPage() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: entries } = useWatchlist();

  async function handleCreate(input: { plateText: string; reason: string; addedBy: string; expiresAt?: string }) {
    await createWatchlistEntry(input);
    await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
  }

  async function handleDeactivate(id: string) {
    setBusyId(id);
    try {
      await deactivateWatchlistEntry(id);
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = entries?.filter((e) => e.active).length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-1 px-4 py-3">
        <span className="font-mono text-xs text-text-muted">
          {activeCount} active · {entries?.length ?? 0} total
        </span>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add to Watchlist
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <WatchlistTable entries={entries ?? []} onDeactivate={handleDeactivate} busyId={busyId} />
      </div>

      <AddWatchlistModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleCreate} />
    </div>
  );
}
