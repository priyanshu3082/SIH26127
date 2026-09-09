"""
Central configuration for the ALPR pipeline. Edit the values below to
point at your own model weights and (optionally) your OpenRouter API key.
"""

# ---- Model paths ----
VEHICLE_MODEL_NAME = "yolov8n.pt"      # pretrained on COCO, auto-downloads on first run
PLATE_MODEL_PATH = "best.pt"           # <-- path to your custom-trained plate-detection weights

# COCO class ids -> human-readable vehicle type
VEHICLE_TYPE_NAMES = {2: "Car", 3: "Motorcycle", 5: "Bus", 7: "Truck"}
VEHICLE_CLASS_IDS = list(VEHICLE_TYPE_NAMES.keys())

VEHICLE_CONF_THRESH = 0.4
PLATE_CONF_THRESH = 0.4

# ---- Frame-level pre-processing ----
# Only downscale if the image is larger than this (never upscale).
# Denoising is off by default - it costs time without a clear detection
# benefit; turn it on for genuinely noisy/low-light footage.
MAX_FRAME_DIM = 1600
ENABLE_FRAME_DENOISE = False

# Extra OCR attempts with stronger pre-processing if the structural/LLM
# check doesn't resolve on the first pass.
MAX_PREPROCESS_RETRIES = 2

# ---- OpenRouter LLM cross-check (optional) ----
# Get a key at https://openrouter.ai/keys. Leave USE_LLM_CROSSCHECK = False
# to skip this entirely and run OCR-only (no API key needed, no cost).
OPENROUTER_API_KEY = "YOUR API KEY HERE"
USE_LLM_CROSSCHECK = True

# Tiered model strategy: the cheap model runs on every attempt. The strong
# (pricier) model is only called once, as a last resort, if OCR + the
# cheap model still disagree after all pre-processing retries are
# exhausted. Check https://openrouter.ai/models for current names/pricing
# and swap these if a model is renamed or deprecated.
OPENROUTER_CHEAP_MODEL = "openai/gpt-4o-mini"
OPENROUTER_STRONG_MODEL = "anthropic/claude-3.5-sonnet"

# ---- Video handling ----
# Every frame decoded from the video is saved to FRAMES_DIR (this is the
# literal "store all the frames" step). Only every Nth *extracted* frame
# is then run through detection into OUTPUT_DIR, since running OCR/LLM on
# every single frame of a real video is usually unnecessary and costly -
# raise/lower this to trade off coverage vs. runtime and API spend.
PROCESS_EVERY_NTH_FRAME = 30

FRAMES_DIR = "frames"
OUTPUT_DIR = "output"
