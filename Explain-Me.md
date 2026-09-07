# CitySight ANPR Prototype: What We Have Built

## 1. Project Purpose

This prototype is for problem statement 26127: a city-wide AI platform that can read vehicle number plates from multiple cameras, reconstruct vehicle movement, show traffic patterns, and raise alerts for important vehicles.

The current version proves the complete product flow using demo data. It is designed so real YOLO, OCR, tracking, and database components can be added later without redesigning the dashboard API.

## 2. What Is Working Now

The prototype currently provides:

- A FastAPI backend.
- A browser dashboard with a GIS map.
- Four demo camera locations.
- Seeded vehicle sightings from multiple cameras.
- Plate search and trajectory reconstruction.
- Camera-wise traffic counts.
- Unique vehicle counts.
- Camera route transition counts.
- Blacklist matching and priority alerts.
- OCR text normalization.
- A basic speed-estimation endpoint.
- API documentation through FastAPI Swagger UI.

The project is located in `SIH26127`.

## 3. Folder Structure

```text
SIH26127/
├── backend/
│   ├── __init__.py
│   ├── app.py
│   └── services_placeholder.md
├── dashboard/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data/
│   ├── cameras.json
│   ├── blacklist.json
│   └── demo_sightings.json
├── .gitignore
├── requirements.txt
├── README.md
├── PrototypeGoal.md
└── Explain-Me.md
```

## 4. How the Application Works

```text
Browser dashboard
        |
        | HTTP requests
        v
FastAPI backend
        |
        +-- cameras.json
        +-- demo_sightings.json
        +-- blacklist.json
```

The backend loads the demo JSON files when it starts. The dashboard then calls the backend APIs and renders the results on the map and in the tables.

## 5. Backend

The main backend file is `backend/app.py`.

It performs the following tasks:

1. Loads camera, sighting, and blacklist data.
2. Starts a FastAPI application.
3. Serves the dashboard files.
4. Normalizes plate text by converting it to uppercase and removing spaces or special characters.
5. Filters sightings by camera or plate.
6. Sorts sightings chronologically for trajectory reconstruction.
7. Calculates camera-level traffic statistics.
8. Counts vehicle movements between cameras.
9. Creates alerts when a detected plate exists in the blacklist.
10. Estimates speed between two consecutive camera sightings.

## 6. API Endpoints

### Health check

```text
GET /api/health
```

Confirms that the backend is running.

### Camera list

```text
GET /api/cameras
```

Returns camera IDs, names, coordinates, directions, and status.

### Sightings

```text
GET /api/sightings
GET /api/sightings?camera_id=CAM-001
GET /api/sightings?plate=DL8CAF1234
```

Returns vehicle plate detections and their timestamps, coordinates, confidence, and vehicle type.

### Vehicle trajectory

```text
GET /api/vehicles/DL8CAF1234/trajectory
```

Returns all known sightings for one plate in chronological order. The dashboard uses these coordinates to draw a route line on the map.

### Analytics

```text
GET /api/analytics
```

Returns total sightings, unique vehicle count, blacklist match count, camera activity, and camera-to-camera route transitions.

### Alerts

```text
GET /api/alerts
```

Returns detections that match the blacklist, including severity, camera, time, and reason.

### OCR normalization

```text
POST /api/ocr/normalize
```

Example request:

```json
{
  "text": "DL 8C AF 1234"
}
```

Example result:

```json
{
  "raw_text": "DL 8C AF 1234",
  "normalized_text": "DL8CAF1234"
}
```

### Speed estimate

```text
GET /api/speed/DL8CAF1234
```

Uses the distance between two camera coordinates and the time difference between detections to estimate a vehicle's speed.

## 7. Dashboard

The dashboard is served from `dashboard/index.html`.

It contains:

- A CitySight header and service status.
- Summary metric cards.
- A Leaflet map showing camera nodes.
- A red route line for the selected plate.
- A trajectory search box.
- Sample plate shortcuts.
- Active blacklist alerts.
- Camera activity and OCR confidence information.
- Top camera-to-camera routes.

The dashboard uses:

- Leaflet for the interactive map.
- OpenStreetMap/CARTO map tiles.
- Plain HTML, CSS, and JavaScript.
- FastAPI endpoints for all displayed data.

## 8. Demo Data

The current demo contains:

- Four cameras: `CAM-001` through `CAM-004`.
- Eight plate sightings.
- Four unique vehicles.
- Two blacklisted vehicles.
- Multi-camera trajectories for sample plates.

Useful sample plates:

```text
DL8CAF1234
MH12RT9087
KA01MN5522
UP16BX4410
```

`DL8CAF1234` and `MH12RT9087` generate blacklist alerts.

## 9. How to Run

From PowerShell:

```powershell
cd d:\1.Work_Related\SIH26127
.\.venv\Scripts\Activate.ps1
uvicorn backend.app:app --reload
```

Open the dashboard:

```text
http://127.0.0.1:8000
```

Open the API documentation:

```text
http://127.0.0.1:8000/docs
```

The dependencies are listed in `requirements.txt` and include FastAPI and Uvicorn.

## 10. What We Validated

The following checks were completed:

- Python backend compilation succeeded.
- All JSON data files parsed successfully.
- FastAPI started successfully.
- `/api/health` returned `ok`.
- `/api/analytics` returned 8 sightings and 4 vehicles.
- The sample trajectory returned 3 camera points.
- The alerts endpoint returned 5 blacklist matches.
- The dashboard root returned HTTP status 200.
- Editor diagnostics reported no errors in the backend or dashboard JavaScript.

## 11. What Is Not Real Yet

This is currently a working product-flow prototype, not a production ANPR system.

The following components still use demo data or placeholders:

- No live CCTV or uploaded video processing yet.
- No YOLO vehicle or plate detector yet.
- No PaddleOCR model yet.
- No ByteTrack or BoT-SORT tracking yet.
- No PostgreSQL/PostGIS database yet.
- No Redis message queue yet.
- No real-time WebSocket updates yet.
- No user authentication or role management yet.
- No accuracy evaluation dataset yet.

Therefore, the prototype must not claim greater than 90% OCR accuracy until it is tested against a labeled dataset containing different lighting, weather, camera angles, motion blur, and damaged plates.

## 12. Next Development Phase

The recommended next steps are:

1. Add `backend/services/detection.py` for YOLO vehicle and plate detection.
2. Add `backend/services/ocr.py` for PaddleOCR recognition.
3. Add `backend/services/tracking.py` for ByteTrack or BoT-SORT IDs.
4. Add a video ingestion endpoint or worker.
5. Replace the JSON store with PostgreSQL and PostGIS.
6. Add image evidence storage for each detection.
7. Add real-time alert delivery.
8. Add a labeled test dataset and calculate detection/OCR accuracy.
9. Add authentication, audit logs, and data retention controls.
10. Package the services with Docker Compose.

The important architectural decision already made is that the dashboard communicates through stable API endpoints. This means the demo JSON data can be replaced by real model and database services while keeping the operator interface mostly unchanged.
