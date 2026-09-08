"""Configuration for the trajectory-engine prototype.

Every module reads these via `config.NAME` (never `from trajectory.config import NAME`)
so that tests can monkeypatch values like DB_PATH per-test.
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # trajectory-engine/
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "trajectory.db"
GRAPH_CACHE_PATH = DATA_DIR / "cache" / "guwahati_drive.graphml"

# Demo city road-network extract. Not tied to anything in the deck - purely which real
# OSM data the road graph (and therefore travel-time feasibility checks) is built from.
# Swappable to any other place name OSMnx/Nominatim can resolve.
DEMO_PLACE = "Guwahati, Assam, India"
NETWORK_TYPE = "drive"

# Fallback speed ceiling (km/h) used when the road graph can't answer a camera pair
# (e.g. a camera snapped to an unreachable node). Keeps feasibility checks from hard-failing.
FALLBACK_SPEED_KMPH = 120.0

# Stage 1 fuzzy plate matching
EDIT_DISTANCE_THRESHOLD = 2       # trajectory search: wide net, Stage 2/3 narrow it down
ALERT_EDIT_DISTANCE_THRESHOLD = 1  # blacklist alerts: tighter, false alerts are costly

# Confusable-character handling (per PROJECT_STATUS.md's named confusion table).
# CONFUSION_PAIRS: bidirectional swap used by the synthetic OCR-noise generator.
# CANONICAL_MAP: one-directional collapse used to normalize a plate for comparison.
CONFUSION_PAIRS = {"0": "O", "O": "0", "8": "B", "B": "8", "1": "I", "I": "1", "5": "S", "S": "5"}
CANONICAL_MAP = {"O": "0", "B": "8", "I": "1", "S": "5"}

# Per-state HSRP-style grammar: 2 letters (state code) + 1-2 digit RTO code + 1-2 letters
# + 4 digits, e.g. KA01AB1234. Deliberately simple for a prototype - not every real HSRP
# edge case, just enough to reject structurally-invalid OCR mutations.
#
# Digit/letter positions are position-aware confusable, not strictly 0-9/A-Z: a digit
# slot also accepts the letters OCR could have confused it with (O,B,I,S) and a letter
# slot also accepts the digits OCR could have confused it with (0,8,1,5). Without this,
# a single digit<->letter OCR misread (e.g. "1"->"I") would fail grammar outright and
# get rejected before the confusion table ever gets a chance to help - which defeats the
# point of combining grammar-checking with confusion tolerance. The state-code prefix
# stays strictly [A-Z]{2}: a digit never appears there, so no confusion is possible.
HSRP_DIGIT_SLOT = "0-9OBIS"
HSRP_LETTER_SLOT = "A-Z0158"
HSRP_PATTERN = (
    rf"^[A-Z]{{2}}[{HSRP_DIGIT_SLOT}]{{1,2}}[{HSRP_LETTER_SLOT}]{{1,2}}[{HSRP_DIGIT_SLOT}]{{4}}$"
)

# Stage 2 feasibility thresholds, as multipliers of the expected (free-flow) travel time
IMPOSSIBLE_MULTIPLIER = 0.8   # observed gap below this fraction of expected -> physically impossible
CHAIN_BREAK_MULTIPLIER = 3.0  # observed gap above this multiple of expected -> flag as a stop

# Privacy / retention (doc's named differentiator: 7-day default, not 90)
RETENTION_DAYS = 7

# Synthetic data generator defaults
NUM_CAMERAS = 20
NUM_VEHICLE_TRIPS = 200
NUM_DECOY_VEHICLES = 15
RANDOM_SEED = 42
