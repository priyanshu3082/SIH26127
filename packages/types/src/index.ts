// Shared DTOs / domain types used across apps/web, apps/api and (loosely) apps/ml-service.
// This is the single source of truth for the shape of data crossing process boundaries.

export type VehicleType = "Car" | "Motorcycle" | "Bus" | "Truck" | "Auto" | "Unknown";

export type CameraStatus = "online" | "offline" | "degraded";

export interface Camera {
  id: string;
  code: string; // e.g. "SEC5-JN-CAM-014"
  name: string;
  lat: number;
  lng: number;
  roadName: string;
  zone: string;
  directionFacing: string;
  status: CameraStatus;
  installedAt: string; // ISO date
}

export interface Detection {
  id: string;
  cameraId: string;
  plateText: string;
  plateTextRaw: string;
  confidenceScore: number;
  detectedAt: string; // ISO datetime
  vehicleType: VehicleType;
  imageUrl: string | null;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  speedEstimateKmph: number | null;
}

export interface DetectionWithCamera extends Detection {
  camera: Pick<Camera, "id" | "code" | "name" | "lat" | "lng" | "roadName" | "zone">;
}

export interface Vehicle {
  id: string;
  plateText: string;
  firstSeenAt: string;
  lastSeenAt: string;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  vehicleType: VehicleType;
}

export type AlertType = "blacklist_match" | "route_anomaly" | "speed_anomaly";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  type: AlertType;
  plateText: string;
  vehicleId: string | null;
  detectionId: string;
  cameraId: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

export interface AlertWithContext extends Alert {
  camera: Pick<Camera, "id" | "code" | "name" | "lat" | "lng">;
}

export interface WatchlistEntry {
  id: string;
  plateText: string;
  reason: string;
  addedBy: string;
  addedAt: string;
  active: boolean;
  expiresAt: string | null;
}

export interface TrajectorySegment {
  fromDetection: DetectionWithCamera;
  toDetection: DetectionWithCamera;
  distanceKm: number;
  durationSeconds: number;
  avgSpeedKmph: number;
  plausible: boolean;
}

export interface TrajectoryResult {
  plateText: string;
  detections: DetectionWithCamera[];
  segments: TrajectorySegment[];
  totalDistanceKm: number;
  totalDurationSeconds: number;
}

export interface TrafficAggregate {
  cameraId: string;
  bucketStart: string; // ISO
  bucketSizeMinutes: number;
  vehicleCount: number;
  avgSpeedKmph: number;
  congestionScore: number; // 0-100
}

export interface ODMatrixEntry {
  originCameraId: string;
  destinationCameraId: string;
  bucketStart: string;
  tripCount: number;
  avgTravelTimeSeconds: number;
}

export interface CityStats {
  totalDetectionsToday: number;
  activeAlerts: number;
  avgCitySpeedKmph: number;
  busiestCorridor: string;
  onlineCameras: number;
  totalCameras: number;
}

export type UserRole = "operator" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Socket.IO event contracts (server -> client)
export interface ServerToClientEvents {
  "detection:new": (payload: DetectionWithCamera) => void;
  "alert:new": (payload: AlertWithContext) => void;
  "alert:updated": (payload: AlertWithContext) => void;
  "camera:status": (payload: { cameraId: string; status: CameraStatus }) => void;
}
