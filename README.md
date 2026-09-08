# SIH26127 — Trajectory Titans

City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the team's working notes and decisions.

## Repo layout

This is a monorepo split by subsystem, matching the six-way team split. Each top-level
folder is self-contained (its own dependencies, its own tests) so subsystems can be
built independently without namespace or dependency-file collisions.

- **[trajectory-engine/](trajectory-engine/)** — trajectory reconstruction, O-D
  estimation, traffic analytics, blacklist/geofence alerts, and the privacy/audit
  stance. Operates purely on event data (plate, camera, timestamp) — no video or
  trained models required. Start here; see its own README for setup.
- `detection/` *(not yet built)* — YOLO/OCR/ByteTrack pipeline that produces the
  plate events `trajectory-engine` consumes.
- `reid/` *(not yet built)* — TransReID cross-camera re-identification (appearance-based
  bridging when a plate read fails outright).
- `api/` *(not yet built)* — service layer exposing `trajectory-engine` (and eventually
  `detection`/`reid`) to a frontend.
- `ui/` *(not yet built)* — dashboard / map / vehicle-search frontend.
