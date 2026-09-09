"""
main.py - FastAPI service wrapping the ALPR pipeline (brief section 4.1).

Two entry points into the same detect_and_read() pipeline used by cli.py:

  POST /infer    - single image -> JSON detections. This is the interface
                   a real camera integration would call per captured frame.
  POST /replay   - batch/replay mode: runs real inference (not synthetic
                   data) over the bundled sample images and POSTs each
                   detection to the NestJS api's /detections endpoint,
                   exactly like a live camera would - so the dashboard can
                   show at least one genuinely-inferred detection end to
                   end, not just the synthetic replay simulator.

Run with: uvicorn main:app --reload --port 8000
"""

import glob
import os
import time
from datetime import datetime, timezone

import cv2
import numpy as np
import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from modules.pipeline import detect_and_read

app = FastAPI(title="SIH26127 ANPR Inference Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # internal service, called by the NestJS api / replay script only
    allow_methods=["*"],
    allow_headers=["*"],
)

API_BASE = os.environ.get("API_BASE", "http://localhost:4000/api")
SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")


class Detection(BaseModel):
    plate_text: str
    confidence: float
    bbox: list[int] | None
    vehicle_type: str
    color: str


class InferResponse(BaseModel):
    detections: list[Detection]
    processing_ms: int


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-service"}


@app.get("/model-info")
def model_info():
    """Backs the frontend's 'model info' panel (brief section 1/4.1) -
    documents which robustness techniques are actually implemented, not
    just claimed."""
    return {
        "vehicleDetector": "YOLOv8 (COCO pretrained)",
        "plateDetector": "YOLOv8 (custom-trained, best.pt)",
        "ocrEngine": "EasyOCR",
        "robustnessTechniques": [
            "CLAHE histogram equalization for low-light plates",
            "Unsharp-mask sharpening pass for motion blur",
            "Multi-pass pre-processing retry ladder (3 escalating variants) when structural validation fails",
            "Indian-plate structural + confusion-map correction (0/O, 1/I, 5/S, 8/B, 2/Z, 4/A, H/W)",
            "Optional LLM vision cross-check (OpenRouter) as a last-resort escalation",
        ],
        "plateFormat": "Indian standard: 2-letter state + 1-2 digit district + 1-3 letter series + 4 digit number",
    }


@app.post("/infer", response_model=InferResponse)
async def infer(file: UploadFile = File(...)):
    contents = await file.read()
    npimg = np.frombuffer(contents, dtype=np.uint8)
    image = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    start = time.time()
    raw_detections = detect_and_read(image)
    elapsed_ms = int((time.time() - start) * 1000)

    detections = [
        Detection(
            plate_text=d["plate_text"],
            confidence=d["confidence"],
            bbox=list(d["vehicle_box"]) if d["vehicle_box"] else None,
            vehicle_type=d["vehicle_type"],
            color=d["color"],
        )
        for d in raw_detections
    ]
    return InferResponse(detections=detections, processing_ms=elapsed_ms)


class ReplaySummary(BaseModel):
    imagesProcessed: int
    detectionsFound: int
    detectionsIngested: int
    errors: list[str]


@app.post("/replay", response_model=ReplaySummary)
def replay(camera_id: str | None = None):
    """Runs real inference over the bundled sample images and posts each
    plate reading to the NestJS api, exactly as a real camera integration
    would - so at least one live detection on the dashboard is genuinely
    model-inferred rather than the synthetic replay simulator's random
    plates."""
    errors: list[str] = []

    if camera_id is None:
        try:
            cams = requests.get(f"{API_BASE}/cameras", timeout=10).json()
            if not cams:
                raise HTTPException(status_code=503, detail="No cameras found in api - seed the database first")
            camera_id = cams[0]["id"]
        except requests.RequestException as e:
            raise HTTPException(status_code=502, detail=f"Could not reach api at {API_BASE}: {e}")

    image_paths = sorted(
        p for p in glob.glob(os.path.join(SAMPLES_DIR, "*.jpg")) if os.path.isfile(p)
    )

    images_processed = 0
    detections_found = 0
    detections_ingested = 0

    for path in image_paths:
        image = cv2.imread(path)
        if image is None:
            errors.append(f"Could not read {path}")
            continue
        images_processed += 1

        for d in detect_and_read(image):
            detections_found += 1
            if not d["plate_text"]:
                continue
            x1, y1, x2, y2 = d["vehicle_box"]
            body = {
                "cameraId": camera_id,
                "plateTextRaw": d["plate_text"],
                "confidenceScore": d["confidence"],
                "detectedAt": datetime.now(timezone.utc).isoformat(),
                "vehicleType": d["vehicle_type"],
                "boundingBox": {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
            }
            try:
                res = requests.post(f"{API_BASE}/detections", json=body, timeout=10)
                res.raise_for_status()
                detections_ingested += 1
            except requests.RequestException as e:
                errors.append(f"{os.path.basename(path)}: ingest failed - {e}")

    return ReplaySummary(
        imagesProcessed=images_processed,
        detectionsFound=detections_found,
        detectionsIngested=detections_ingested,
        errors=errors,
    )
