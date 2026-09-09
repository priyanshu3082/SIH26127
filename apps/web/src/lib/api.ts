import { useQuery } from "@tanstack/react-query";
import type {
  AlertWithContext,
  Camera,
  CityStats,
  DetectionWithCamera,
  ODMatrixEntry,
  TrafficAggregate,
  TrajectoryResult,
  WatchlistEntry,
} from "@sih/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

export function useCameras() {
  return useQuery({
    queryKey: ["cameras"],
    queryFn: () => fetchJson<Camera[]>("/cameras"),
    refetchInterval: 30_000,
  });
}

export function useCityStats() {
  return useQuery({
    queryKey: ["city-stats"],
    queryFn: () => fetchJson<CityStats>("/analytics/city-stats"),
    refetchInterval: 10_000,
  });
}

export function useHeatmap() {
  return useQuery({
    queryKey: ["heatmap"],
    queryFn: () =>
      fetchJson<(TrafficAggregate & { camera: Camera })[]>("/analytics/heatmap"),
    refetchInterval: 30_000,
  });
}

export function useOdMatrix() {
  return useQuery({
    queryKey: ["od-matrix"],
    queryFn: () =>
      fetchJson<(ODMatrixEntry & { originCamera: Camera; destinationCamera: Camera })[]>(
        "/analytics/od-matrix",
      ),
    refetchInterval: 60_000,
  });
}

export function useRecentDetections(limit = 30) {
  return useQuery({
    queryKey: ["detections", "recent", limit],
    queryFn: () => fetchJson<DetectionWithCamera[]>(`/detections/recent?limit=${limit}`),
    refetchInterval: 15_000,
  });
}

export function useAlerts(status?: string) {
  return useQuery({
    queryKey: ["alerts", status ?? "all"],
    queryFn: () => fetchJson<AlertWithContext[]>(`/alerts${status ? `?status=${status}` : ""}`),
    refetchInterval: 15_000,
  });
}

export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: () => fetchJson<WatchlistEntry[]>("/watchlist"),
  });
}

export async function fetchTrajectory(plate: string, from?: string, to?: string) {
  const params = new URLSearchParams({ plate });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return fetchJson<TrajectoryResult>(`/trajectory?${params.toString()}`);
}

export async function fetchKnownPlates(q: string) {
  if (!q) return [];
  return fetchJson<{ plateText: string }[]>(`/detections/known-plates?q=${encodeURIComponent(q)}`);
}

export async function acknowledgeAlert(id: string, by: string) {
  return patchJson<AlertWithContext>(`/alerts/${id}/acknowledge`, { by });
}

export async function resolveAlert(id: string) {
  return patchJson<AlertWithContext>(`/alerts/${id}/resolve`, {});
}

export async function createWatchlistEntry(input: {
  plateText: string;
  reason: string;
  addedBy: string;
  expiresAt?: string;
}) {
  return postJson<WatchlistEntry>("/watchlist", input);
}

export async function deactivateWatchlistEntry(id: string) {
  return patchJson<WatchlistEntry>(`/watchlist/${id}/deactivate`, {});
}
