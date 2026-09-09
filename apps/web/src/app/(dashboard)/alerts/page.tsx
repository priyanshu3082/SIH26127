"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@sih/ui";
import { AlertsTable } from "@/components/alerts/AlertsTable";
import { AlertsMap } from "@/components/alerts/AlertsMap";
import { useAlerts, acknowledgeAlert, resolveAlert } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  all: "All statuses",
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

export default function AlertsPage() {
  const [status, setStatus] = React.useState<string>("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: alerts } = useAlerts(status === "all" ? undefined : status);
  const { data: openAlerts } = useAlerts("open");

  async function handleAcknowledge(id: string) {
    setBusyId(id);
    try {
      await acknowledgeAlert(id, "operator");
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } finally {
      setBusyId(null);
    }
  }

  async function handleResolve(id: string) {
    setBusyId(id);
    try {
      await resolveAlert(id);
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-1 px-4 py-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue>{STATUS_LABELS[status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="font-mono text-xs text-text-muted">{alerts?.length ?? 0} alert(s)</span>
      </div>

      <Tabs defaultValue="table" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border-subtle bg-bg-1 px-4 py-2">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="map">Map ({openAlerts?.length ?? 0} open)</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="table" className="min-h-0 flex-1 overflow-auto p-4">
          <AlertsTable
            alerts={alerts ?? []}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
            busyId={busyId}
          />
        </TabsContent>

        <TabsContent value="map" className="min-h-0 flex-1">
          <AlertsMap alerts={openAlerts ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
