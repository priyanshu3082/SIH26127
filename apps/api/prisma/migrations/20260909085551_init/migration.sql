-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "roadName" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "directionFacing" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'online',
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plateText" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "vehicleType" TEXT NOT NULL DEFAULT 'Unknown'
);

-- CreateTable
CREATE TABLE "Detection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cameraId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "plateText" TEXT NOT NULL,
    "plateTextRaw" TEXT NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "detectedAt" DATETIME NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "imageUrl" TEXT,
    "boundingBoxJson" TEXT,
    "speedEstimateKmph" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Detection_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Detection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "plateText" TEXT NOT NULL,
    "vehicleId" TEXT,
    "detectionId" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" DATETIME,
    CONSTRAINT "Alert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alert_detectionId_fkey" FOREIGN KEY ("detectionId") REFERENCES "Detection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alert_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plateText" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "TrafficAggregate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cameraId" TEXT NOT NULL,
    "bucketStart" DATETIME NOT NULL,
    "bucketSizeMinutes" INTEGER NOT NULL DEFAULT 5,
    "vehicleCount" INTEGER NOT NULL,
    "avgSpeedKmph" REAL NOT NULL,
    "congestionScore" REAL NOT NULL,
    CONSTRAINT "TrafficAggregate_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ODMatrixEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originCameraId" TEXT NOT NULL,
    "destinationCameraId" TEXT NOT NULL,
    "bucketStart" DATETIME NOT NULL,
    "tripCount" INTEGER NOT NULL,
    "avgTravelTimeSeconds" REAL NOT NULL,
    CONSTRAINT "ODMatrixEntry_originCameraId_fkey" FOREIGN KEY ("originCameraId") REFERENCES "Camera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ODMatrixEntry_destinationCameraId_fkey" FOREIGN KEY ("destinationCameraId") REFERENCES "Camera" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Camera_code_key" ON "Camera"("code");

-- CreateIndex
CREATE INDEX "Camera_zone_idx" ON "Camera"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateText_key" ON "Vehicle"("plateText");

-- CreateIndex
CREATE INDEX "Vehicle_plateText_idx" ON "Vehicle"("plateText");

-- CreateIndex
CREATE INDEX "Detection_plateText_idx" ON "Detection"("plateText");

-- CreateIndex
CREATE INDEX "Detection_cameraId_detectedAt_idx" ON "Detection"("cameraId", "detectedAt");

-- CreateIndex
CREATE INDEX "Detection_detectedAt_idx" ON "Detection"("detectedAt");

-- CreateIndex
CREATE INDEX "Alert_status_createdAt_idx" ON "Alert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_plateText_idx" ON "Alert"("plateText");

-- CreateIndex
CREATE INDEX "Watchlist_plateText_active_idx" ON "Watchlist"("plateText", "active");

-- CreateIndex
CREATE INDEX "TrafficAggregate_bucketStart_idx" ON "TrafficAggregate"("bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficAggregate_cameraId_bucketStart_bucketSizeMinutes_key" ON "TrafficAggregate"("cameraId", "bucketStart", "bucketSizeMinutes");

-- CreateIndex
CREATE UNIQUE INDEX "ODMatrixEntry_originCameraId_destinationCameraId_bucketStart_key" ON "ODMatrixEntry"("originCameraId", "destinationCameraId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
