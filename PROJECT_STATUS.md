# Trajectory Titans — SIH26127 Project Notes

**PS ID:** SIH26127
**Title:** City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics
**Theme:** Smart Automation · **Category:** Software
**Sponsor:** BEL (Bharat Electronics Limited)

This is the single living status doc for the project — update it in place as things
change rather than creating new status files elsewhere. If you're new to the project,
read the next four sections in order; everything after "Where we landed" is more
detailed history/decision-log for reference.

---

## 1. What this project is, in plain English

Imagine a city full of traffic cameras that read license plates. If a car passes
camera 1, then camera 2, then camera 3, we want to connect those three separate
sightings into one story: "this one car's journey." Once you can do that for every
car, you can catch stolen cars automatically, help emergency response, and see which
roads are actually busy.

**Why it's harder than it sounds — three specific traps most simple systems fall into:**
1. Cameras misread plates sometimes (blur, angle, rain) — one wrong letter can make
   software think it's a different car entirely, or wrongly stitch together two
   different cars that happen to look similar.
2. Sometimes a plate can't be read at all (bad angle, motorcycle, glare) — so there's
   a gap in the trail. Most basic systems just give up at that point.
3. City planners want to know "where do cars actually go" (a flow map), not just "how
   many cars passed each camera" (a simple counter). Building the flow map is much
   harder, so most competing teams skip it.

Our whole pitch is built around fixing exactly those three things, rather than
building "OCR + a database join + a map" and calling it done.

## 2. What we've actually built (plain English)

Everything below is real, tested, working code — not a plan — living in
[trajectory-engine/](trajectory-engine/). It runs entirely on event data (a plate
reading, which camera, what time) with no video and no trained AI models, which is
why it could be built and proven working before the camera/OCR side of the project
exists.

- **A "wide net" search** — when you look up a plate, it grabs every camera reading
  close enough to match, even with a character or two off, since misreads happen. It
  isn't picky yet at this stage.
- **A "does this make physical sense?" check** — for every two sightings that might
  be the same car, it checks: could a real car have actually driven between those two
  cameras in that amount of time, on real roads at realistic speeds? Too fast to be
  possible → thrown out. Very slow → kept, but flagged "car probably stopped
  somewhere."
- **A "best overall story" picker** — sometimes two different cars could both explain
  the same gap (the real car, and a decoy with a similar-looking plate passing by
  around the same time). Instead of grabbing whichever match it finds first, it looks
  at every candidate at once and mathematically picks the most consistent explanation,
  using the car's type and colour as an extra tiebreaker clue.
- **A city-wide traffic flow map** — beyond single cars, it estimates "where do cars
  go from A" across the whole city, filling in gaps from partial observations. This
  is exactly the piece most competing teams will skip, per the problem statement.
- **Instant alerts** — flags a car the moment it matches a "wanted" list, or enters a
  specially-watched area.
- **Traffic health monitoring** — figures out which roads are busier than normal by
  comparing real observed travel times to expected ones.
- **Privacy rules built in, not bolted on** — every lookup must be tied to an official
  case ID and gets logged, so there's always an audit trail. Old sighting records get
  automatically deleted after 7 days.
- **A real map you can look at** — opens in a browser, shows a car's actual route
  drawn on real streets (not a straight line), can show many cars at once, and has a
  search box to find one.

**How do we know it actually works, not just "looks right on paper"?** Since we don't
have real camera footage yet, we invented 215 pretend cars with pretend camera
sightings (including intentionally bad/corrupted readings and decoy plates meant to
trip it up), wrote 31 automated checks, and actually ran everything end-to-end — which
caught 2 real bugs we then fixed, not just theoretical ones. We've since also gotten
hold of a real (not pretend) multi-camera vehicle dataset, CityFlowV2 — see section 5.

## 3. What's missing / limitations, in plain English

1. **No real camera footage or plate-reading yet.** Everything above runs on pretend
   data. The piece that watches actual video and reads plate text hasn't been started
   — that's a separate, bigger piece of work.
2. **No real "recognize the car by its looks" feature.** Right now it's just a
   placeholder using type/colour as a weak hint — real photo-based recognition
   (matching a car's actual appearance across cameras) isn't built.
3. **No app or website for a normal person to use.** Right now it's a command-typed-
   in-a-terminal tool for testing — nothing a police officer or city planner could
   click through.
4. **Not connected to real, live cameras.** Everything works off a saved file, not a
   live video feed.
5. **No login/permissions system.** Anyone running the tool can look up anything
   right now; a real deployment needs to control who's allowed to search what.
6. **Not yet validated against real footage.** We now have a real dataset (CityFlowV2)
   but haven't run the validation yet — see section 5 for exactly what it can and
   can't prove.
7. **The map-drawing and matching logic use hand-picked settings, not tuned ones.**
   E.g. how heavily a slow trip counts against a match — these are reasonable guesses
   that haven't been calibrated against real-world data yet.

## 4. Technical glossary — the plain-English pieces, named properly

For anyone who wants the actual terms/tools behind the plain descriptions above:

| Plain description | What it's actually called / built with |
|---|---|
| "Cast a wide net" search | **Levenshtein edit distance** (via the `rapidfuzz` Python library) + a hand-built character **confusion table** (0↔O, 1↔I, 5↔S, 8↔B) + a regex grammar check for Indian plate format (HSRP) |
| "Does this make physical sense?" check | Road-network **shortest-path travel time**: real map data from **OpenStreetMap**, loaded via **OSMnx**, shortest path computed with **NetworkX's Dijkstra's algorithm** (the same core technique GPS apps use) |
| "Best overall story" picker | The **Hungarian algorithm** (optimal bipartite assignment), via `scipy.optimize.linear_sum_assignment`, over a hand-weighted cost combining edit distance, OCR confidence, travel-time plausibility, and vehicle type/colour agreement |
| "City-wide traffic flow map" | **Iterative Proportional Fitting (IPF)** — a classical statistics method from transportation planning, estimating a full origin-destination matrix from partial observations |
| "Traffic health monitoring" | A **congestion index** = observed travel time ÷ free-flow baseline travel time, both computed from the same road graph |
| The interactive map | **Folium** (a Python wrapper around the **Leaflet.js** JavaScript mapping library); road geometry from the same OSMnx/OpenStreetMap graph, drawn as the actual shortest-path route, not a straight line |
| Where the data lives | **SQLite** — a lightweight, single-file embedded database (nothing to install/run as a server) |
| How we know it works | **pytest** — Python's standard automated-testing framework, 31 test cases, run from a clean virtual environment (`.venv`) |
| Privacy enforcement | A custom **audit-log table** + a retention-purge function (plain SQL, no external tool) |

**How the map's road-routing actually works, step by step:** OSMnx downloads a real
road network from OpenStreetMap (a free, crowdsourced global map) for one city, and
turns it into a **graph** — intersections become *nodes*, road segments become
*edges*, each edge weighted by a realistic travel time (road type + speed limit).
NetworkX then runs Dijkstra's shortest-path algorithm between two camera locations
over that graph, exactly like a GPS app computing a route — cached locally after the
first download, so no internet is needed afterward.

---

## 5. CityFlowV2 dataset — what we have and what it proves (downloaded 2026-09-08)

**Getting it turned out to be easy, not hard.** The 2026 AI City Challenge no longer
has a track like this (its 6 current tracks are indoor 3D perception/robots, safety
captioning, anomaly reasoning, person search, video forecasting, and cross-city
detection — none of them outdoor multi-camera vehicle tracking). But the organizers
changed policy: old-year datasets no longer require a request form or waiting period.
CityFlowV2 (2022 Track 1) is a direct Google Drive download + one-page click-through
license, from `aicitychallenge.org/ai-city-challenge-dataset-access/` →
`2022-track1-download`. Downloaded to `trajectory-engine/CITYFLOW DATA/` (17GB,
git-ignored — never commit this).

(Also checked [SKKUAutoLab/aic26_cross_city](https://github.com/SKKUAutoLab/aic26_cross_city)
before finding the above — it wasn't a substitute, it solves cross-city *detection
generalization*, not cross-camera identity tracking, with no cross-camera ID ground
truth. Noting it here so nobody re-checks it later.)

**What's actually in the downloaded data, confirmed by inspecting the files directly:**
46 cameras, 6 scenarios (S01-S06), 880 annotated vehicles, real videos + ground truth.
`gt.txt` per camera lists `[frame, vehicle_id, x, y, w, h, ...]`, and the same
`vehicle_id` is confirmed reused across every camera in a scenario that vehicle passed
through — genuine cross-camera identity ground truth.

**Can it be used for all our use cases? No — strong for two, unusable for two others:**

| Use case | Verdict | Why |
|---|---|---|
| **Stage 2** validation (feasibility filtering) | ✅ Usable, but differently than planned | Real per-camera timestamps exist, so real observed travel times between cameras can be computed. But there's **no real per-camera GPS** — only one approximate GPS point shared by *all* cameras in a scenario — so it cannot plug into our OSMnx/Guwahati road-routing approach. The "expected time" baseline has to be derived from the data's own ground truth instead. |
| **Stage 3** validation (Hungarian/contradiction resolution) | ✅ Directly usable | Confirmed real cross-camera identity ground truth — exactly what's needed to test whether Stage 3 correctly untangles competing candidates. |
| **Stage 1** validation (plate fuzzy-matching) | ❌ Not usable | Zero license plate text anywhere — plates were never annotated. Nothing here can test the confusion-table/edit-distance/grammar logic. Still needs separate OCR-specific datasets (Indian_LPR, umar1103, synthetic HSRP). |
| **Stage 4** (`reid/`, appearance matching) | ❌ Not usable as-is | Has raw videos and bounding boxes, but not the separate pre-cropped training-image set TransReID needs. Could be built later by cropping from the boxes, but isn't ready today. |

---

## Where we landed

Went through the full SIH26127 list, weighed against team size (6), domain fit, and
submission crowding, and picked ANPR trajectory tracking over the other shortlisted options
(polar logistics, material harmonization, semiconductor burn-in). Reasoning: CV-heavy team
strength, high visibility with BEL, and enough sub-problems to split six ways even though it's
one of the more crowded PS categories.

**The core insight the whole pitch rests on:** most teams will build OCR + a database join +
a map and call it done. That fails in three specific ways — a misread plate silently joins the
wrong trajectory, the trail goes blank the moment a plate can't be read, and origin-destination
patterns (which the PS explicitly asks for) get replaced with a vehicle-count heatmap. Our
differentiation is built around fixing exactly those three things.

## What's locked in the deck

- **Problems identified:** fragmented camera network, inaccurate/partial ANPR reads, no
  cross-camera identity linking, massive data volume, lack of real-time alerts, limited traffic
  insights
- **Solution strategy:** end-to-end AI pipeline (YOLO + OCR + tracking), multi-signal vehicle
  identity correlation (plate + feasibility + appearance), real-time trajectory reconstruction,
  urban traffic analytics, real-time alerts, scalable/secure architecture
- **Architecture:** 5 layers — Data Ingestion → AI Processing → Data Storage → Intelligence
  Layer (Vehicle Identity Resolution, Trajectory Reconstruction Engine, Traffic Analytics
  Engine) → Application Layer
- **Feasibility & Viability:** 7 risks paired with mitigations — OCR misreads, no Indian
  multi-camera dataset, clock drift, video volume, camera heterogeneity, surveillance misuse,
  and climate/low-light challenges (added multi-frame + IR support for the last one)
- **Impact:** social (emergency response, accident reduction, public trust, missing-person
  cases) and economic (lower enforcement cost, recovered toll/fine revenue, congestion savings,
  zero new hardware cost)
- **References:** YOLOv11, PaddleOCR, ByteTrack, OSRM, TransReID — each with the paper or repo
  linked

## Key decisions made along the way

**Data strategy — the problem splits in two.** No dataset exists with Indian plates tracked
across multiple cameras, so OCR and cross-camera tracking train independently:
- OCR: Indian_LPR (pretrained baseline), umar1103 (30k, CC BY 4.0), Roboflow (two-wheelers),
  CCPD2019 (pretraining, Chinese format), synthetic HSRP generation for the gap
- Cross-camera tracking: CityFlowV2 (plates redacted, but has camera calibration — the only
  dataset that lets us test feasibility filtering against ground truth), VeRi-776 as fallback
- Validate on real images only, never on synthetic

**CityFlowV2 turned out not to need a request at all — downloaded 2026-09-08. See
section 5 above for the full assessment of what it can and can't validate.**

**Algorithm decisions:**
- Detection: YOLOv11 / RT-DETR
- OCR: PaddleOCR default, PARSeq for hard scene-text, LPRNet fast path via Indian_LPR weights
- Within-camera tracking: ByteTrack / BoT-SORT (runs right after detection, before OCR —
  one OCR call per vehicle pass, not one per frame)
- Plate decoding constrained to per-state HSRP grammar + confusion table (0↔O, 8↔B, 1↔I, 5↔S)
- Cross-camera re-identification: TransReID, trained on CityFlowV2-ReID — this is what keeps
  the trail alive when a plate can't be read
- Feasibility filtering: road-network travel-time checks reject physically impossible
  camera-to-camera hops; Hungarian algorithm resolves contradicting matches
- O-D estimation: Iterative Proportional Fitting from partial camera observations

**Privacy stance:** 7-day default retention (not 90 — deliberately short), every trajectory
query bound to a case ID and audit-logged, DPDP Act 2023 named explicitly, VAHAN/Parivahan as
the legitimate RC lookup path. This is in the deck because most competing teams won't mention
privacy at all, and BEL deploys under real compliance constraints.

---

## Trajectory reconstruction prototype — detailed status (built and verified, 2026-09-08)

Stages 1-3 (the pitch's core differentiator) plus O-D estimation, traffic analytics,
blacklist/geofence alerts, and the privacy/audit stance are built and working, in
**[trajectory-engine/](trajectory-engine/)**. See `trajectory-engine/README.md` for
setup/run instructions. (Section 2 above gives the plain-English version of all of this.)

**Stack decisions made (deviating from the original PostGIS/OSRM idea for the
prototype, not the deck's eventual production stack):**
- **SQLite, not PostGIS** — every lookup is an exact `camera_id` join against a small
  fixed camera set, never a spatial "nearest/within-radius" query, so PostGIS's
  spatial indexing wasn't needed. Consistent with the deck's own tech stack, which
  names plain PostgreSQL, not PostGIS.
- **OSMnx + NetworkX, not a live OSRM server** — cameras are a small, fixed node set,
  so what's actually needed is a precomputed camera×camera travel-time matrix, not
  general-purpose routing at scale. Same underlying OSM data as OSRM, no Docker/server
  (which matters concretely on Windows). The travel-time lookup is isolated behind one
  function (`roadgraph/travel_time.py:get_travel_time`) so swapping in a real OSRM
  backend later touches only that file.
- **Demo city: Guwahati**, as a placeholder OSM extract — not named anywhere in the
  deck, swappable via one config value (`config.DEMO_PLACE`) whenever a real demo city
  is decided.

**What's actually been verified, not just written:**
- 31 offline unit/integration tests passing (`pytest tests/`), run from a clean
  `.venv` built from `requirements.txt` alone — no dependency issues
- The real Guwahati road network downloaded and cached (5,087 nodes, one connected
  component)
- 215 synthetic vehicles (200 + 15 decoys) generated across 20 real-road-network
  camera positions
- End-to-end reconstruction against real generated data: correctly recovers full
  multi-stop trajectories, correctly excludes a deliberately-corrupted grammar-invalid
  read while still recovering the rest of the trip, correctly flags chain breaks
  (unusually long gaps) and rejects physically-impossible transitions
- Alerts (blacklist + geofence), traffic analytics (density/speed/congestion), and
  O-D estimation (IPF) all run successfully against the real generated dataset
- Two real bugs found and fixed by actually running the tests (not just writing them):
  Stage 3's cost weighting could truncate a legitimate-but-slow trajectory instead of
  keeping it (time-gap penalty outweighed the "give up" cost); the O-D IPF test's
  tolerance was tighter than the algorithm's normal (slow, logarithmic) convergence —
  both documented inline in the code
- Map visualization (`trajectory.cli --visualize` / `--fleet N`) draws the **real
  road-network route** for each hop (not a straight line between cameras) using the
  same road graph; a chain-break hop is drawn as a dashed line instead, since the
  actual path during an unexplained gap is genuinely unknown — drawing a "real" route
  there would misrepresent what we know
- `--fleet N` plots multiple vehicles on one map at once, each its own colour/layer,
  with a client-side search box to isolate one plate. This is a static filter over
  vehicles already rendered into that HTML file, not a live database query — a true
  "ask it anything" interface needs a running backend (the reserved, not-yet-built
  `api/` folder)

**Known limitations / tech debt (real, not hypothetical — worth tracking):**
- No accuracy validation against real-world ground truth yet — everything validated
  so far is synthetic-generator-vs-itself, which trivially matches since both sides
  share the same generating assumptions. CityFlowV2 (section 5) is the first real
  signal, once the concrete tasks below are done.
- Stage 3's cost weights (`assignment/hungarian.py: WEIGHTS`) are hand-tuned, not
  calibrated against real mismatch/match data. Already found one miscalibration by
  testing; there are likely others waiting for messier real data.
- IPF's O-D convergence is slow for sparse matrices at prototype scale (20 cameras);
  would need attention (or a different algorithm) at real city scale (thousands of
  cameras), where the all-pairs travel-time precompute becomes the bigger bottleneck
  first anyway.
- "Suspicious route deviation" alerting is deliberately deferred — needs a historical
  per-vehicle baseline this prototype has no data to build.

## Assumptions baked into the data (read before feeding this real input)

Things `trajectory-engine` assumes are already true about incoming data, rather than
things it derives or checks itself:

- **Clock sync is already solved.** `ts` is assumed to be a clean, synchronized Unix
  timestamp. Zero NTP/PTP drift-correction exists in this codebase, even though the
  deck's own feasibility slide names clock drift as a real risk — synchronization has
  to happen *before* timestamps reach this system, or Stage 2's feasibility math (which
  is entirely gap-vs-expected-time) will silently misjudge real transitions.
- **Cameras are pre-registered.** Every event assumes its `camera_id` already exists in
  the `cameras` table (id, name, lat, lon) — it's a foreign key. Nothing in the repo
  manages "a new physical camera came online"; the synthetic generator fakes this by
  placing cameras itself. **Nobody currently owns a real camera-registry process.**
- **One row per vehicle pass, not per video frame.** The schema assumes within-camera
  tracking (ByteTrack/BoT-SORT) already collapsed a full pass through one camera into a
  single representative plate read. If a producer instead emits one row per frame,
  Stage 2/3 will see a flood of near-duplicate events with near-zero time gaps and get
  confused.
- **OCR confidence is meaningful.** Stage 3's cost function leans on `confidence` being
  a real, calibrated 0-1 score. An uncalibrated or absent confidence value breaks that
  weighting silently — bad reads get trusted as much as good ones.
- **Vehicle attributes are always non-null — a real gap found while writing this.**
  `assignment/hungarian.py`'s `_attribute_mismatch()` treats two missing values
  (`vehicle_type` absent on both sides) as a **match** (`None == None` → True), quietly
  inflating confidence for pairs where attribute data is simply absent, instead of
  treating it as "no signal." Not caught by existing tests since the synthetic
  generator always populates these fields. **Needs fixing before a real
  attribute-extraction model (which can return null) feeds this.**
- **Plate format is narrow HSRP only.** The grammar regex only covers 2-letter-state +
  1-2-digit + 1-2-letter + 4-digit. BH-series, EV green plates, dealer/temporary
  plates, and diplomatic plates all get rejected by Stage 1 outright as-is.
- **The confusion table is a minimal starting set.** Only 4 character pairs modeled
  (0/O, 1/I, 5/S, 8/B) — real OCR error patterns will likely need more added once real
  misread data exists to look at.
- **Thresholds are hand-picked, not calibrated.** Edit-distance ≤2, the 0.8×/3.0×
  feasibility multipliers, Stage 3's cost weights — reasonable guesses, none tuned
  against real data yet.
- **One camera = one point location.** No modeling of multiple cameras at one
  intersection, per-lane cameras, or one camera covering more than one direction.
- **SQLite assumes low write concurrency.** A real live-ingestion pipeline writing
  continuously while an API reads simultaneously will hit SQLite's locking limits —
  Postgres is the flagged swap-out, not yet done.
- **`case_id` is trusted, not authorized.** `reconstruct_trajectory` only checks the
  string is non-empty — it doesn't verify the case exists or that the caller may use
  it. It logs faithfully, enforces nothing. Real authorization is assumed to be
  someone else's layer.
- **Synthetic traffic patterns are simplistic.** Random origin-destination pairs, no
  rush-hour peaks, no realistic route popularity — O-D/analytics have only been
  checked against this simplified pattern.

## What each other part of the project depends on / must do

- **`detection/` (YOLO + OCR + ByteTrack) owner** — must emit rows in exactly
  `plate_events`' shape (pre-registered `camera_id`, clock-synced `ts`, `plate_raw`,
  calibrated `confidence`, `vehicle_type`/`vehicle_color`), deduped to one row per
  vehicle pass. Must write to whatever storage trajectory-engine ends up using
  (SQLite now, likely Postgres later) — isolated to `db/store.py`, the one file that
  needs coordinating on.
- **Camera registration & clock sync owner** *(currently nobody)* — needs to populate
  `cameras` before a camera goes live, and needs an NTP/PTP strategy. Both are
  currently assumed already solved.
- **`reid/` (TransReID) owner** — needs to source the separate CityFlowV2-ReID crop
  dataset, or crop training images from CityFlowV2's raw videos using `gt.txt` boxes
  (neither exists yet). Needs to coordinate wiring a real appearance-similarity score
  into `assignment/hungarian.py`'s cost function — a slot is left for this, only a
  cheap type/colour stand-in exists today.
- **`api/` owner** — wraps `pipeline.reconstruct_trajectory` / `traffic_analytics` /
  `od_analytics` / `alerts` behind HTTP endpoints. Must add real authorization on top
  of `case_id` (trajectory-engine only logs, doesn't enforce). Needs to resolve how
  this reconciles with Sumanth's already-existing FastAPI prototype on the `sumanth`
  branch (different data shape — flat JSON, not SQLite) — still an open team
  conversation, not resolved.
- **`ui/` owner** — only depends on whatever `api/` exposes, not on trajectory-engine
  directly. The CLI's fleet map is a reference for *what* it could show (multi-vehicle
  map + plate search), not something to build on top of literally.
- **Whoever picks the final demo city** — needs to verify that city's OpenStreetMap
  coverage is actually complete and connected (validated for Guwahati specifically —
  5,087 nodes, one connected component — not guaranteed for an arbitrary smaller town)
  before swapping `config.DEMO_PLACE`.
- **Whoever scales this past prototype** — swap SQLite → Postgres (schema is
  portable, it's a connection-string change); move the camera-pair travel-time
  precompute from full O(N²) to on-demand/incremental at real city scale (thousands
  of cameras).

## What's still missing (the rest of the five-layer architecture)

Trajectory reconstruction was deliberately chosen first because it needs no video or
trained models. Everything else in the deck's architecture is still unbuilt:

- **`detection/`** (not started) — YOLO + OCR + ByteTrack. This is what would actually
  *produce* `plate_events`; right now that table only exists via the synthetic
  generator.
- **`reid/`** (not started) — TransReID cross-camera appearance re-identification
  (Stage 4, bridging the gap when a plate can't be read at all). Only a cheap stand-in
  exists today: vehicle type/colour as a categorical signal in Stage 3's cost function.
- **`api/`** (not started) — no service layer, so nothing is queryable live/from a
  browser without running the CLI.
- **`ui/`** (not started) — no dashboard, no map/search frontend (deck names React +
  MapLibre GL + Grafana).
- **Streaming ingestion** (Kafka/Spark-Flink in the deck's architecture) — this
  prototype reads a static SQLite snapshot, not a live camera feed.
- **RBAC / case management / user system** — only the audit-*log* half of the privacy
  stance exists (every query is logged); nothing yet checks *who* is allowed to use a
  given case ID.
- **Real camera ingestion** (RTSP/ONVIF, camera abstraction layer, NTP/PTP clock-drift
  correction) — no real cameras wired in anywhere; timestamps are assumed clean.

## Open items not yet settled

- **Real footage access** — even one camera changes the credibility story a lot
- **Team ID** — still blank on the title slide
- **Re-identification ownership** — biggest technical unknown (Stage 4 / `reid/`),
  needs a named owner. Now sharper: CityFlowV2 is in hand but doesn't include
  pre-cropped ReID training images, so whoever owns this also owns deciding whether to
  hunt down the separate CityFlowV2-ReID subset or crop training images from the raw
  videos using `gt.txt` boxes.
- **Final demo city** — Guwahati is a placeholder for the prototype only, not a
  decision. Separately, CityFlowV2's cameras are in an unrelated U.S. city with no
  usable per-camera GPS, so it can never answer the demo-city question either — that
  stays a decision to make independently.

## Concrete tasks to pick up next

- [ ] Build a small adapter that reads CityFlowV2's `gt.txt` + `cam_timestamp` for one
      scenario (start with S01, only 5 cameras) and converts it into
      `trajectory-engine`'s `plate_events` shape, using each vehicle's numeric ID in
      place of a plate string
- [ ] Derive Stage 2's "expected travel time" per real camera pair **empirically from
      the ground truth itself** (median observed transition time across many real
      vehicles) instead of OSMnx — CityFlowV2 has no usable GPS for road-network
      routing, so this is the only correct baseline for validating against this data
- [ ] Validate Stage 2 + Stage 3 accuracy against that real cross-camera identity
      ground truth (does the pipeline reconstruct the same per-vehicle camera chains
      `gt.txt` shows?) — the first real (non-synthetic-vs-itself) accuracy signal
- [ ] Calibrate Stage 3's cost weights against that real validation data instead of
      the current hand-tuned defaults
- [ ] Separately source plate data for Stage 1 validation (CityFlowV2 has none) —
      Indian_LPR / umar1103 / synthetic HSRP as already planned
- [ ] Decide who owns Stage 4 / `reid/` (TransReID cross-camera re-identification),
      and resolve the ReID training-image gap noted above
- [ ] Start `detection/` (YOLO + OCR + ByteTrack) so `trajectory-engine` has a real
      `plate_events` producer instead of only the synthetic generator
- [ ] Decide on `api/` + `ui/` ownership once there's something real to expose
