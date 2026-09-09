// Geospatial helpers standing in for PostGIS ST_Distance / ST_MakeLine, since the
// project runs on SQLite (no PostGIS) rather than Postgres. Swap for PostGIS
// functions behind these same signatures if the project moves to Postgres.

const EARTH_RADIUS_KM = 6371;

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in kilometres. */
export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/** Real-road-distance fudge factor applied to straight-line distance, since we
 * don't have a routable road graph in this build — cars don't drive in straight
 * lines. 1.35x is a reasonable urban-grid approximation. */
export const ROAD_WINDING_FACTOR = 1.35;

export function estimateRoadDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return haversineDistanceKm(a, b) * ROAD_WINDING_FACTOR;
}

export function speedKmph(distanceKm: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return (distanceKm / durationSeconds) * 3600;
}
