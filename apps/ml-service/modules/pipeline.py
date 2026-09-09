"""
pipeline.py

Core per-frame routine: runs vehicle detection, plate detection + text
extraction, and color estimation, and draws the overlay used for the
saved bounded image.
"""

import cv2

from modules.preprocessing import preprocess_image, crop
from modules.vehicle_detector import detect_vehicles
from modules.plate_detector import detect_plates
from modules.color_detector import get_dominant_color
from modules.text_extraction import extract_plate_text
from modules.ocr_engine import structural_correct


def detect_and_read(image_bgr, verbose=False):
    """
    Runs the full detection stack on a single image/frame. Returns a list
    of dicts: {vehicle_box, plate_box, vehicle_type, color, plate_text}.
    All boxes are in image_bgr's ORIGINAL coordinate space (the internal
    downscale from preprocess_image is corrected for before returning).
    """
    processed = preprocess_image(image_bgr)
    h0, w0 = image_bgr.shape[:2]
    h1, w1 = processed.shape[:2]
    scale_x, scale_y = w0 / w1, h0 / h1

    def to_original(box):
        x1, y1, x2, y2 = box
        return (int(x1 * scale_x), int(y1 * scale_y), int(x2 * scale_x), int(y2 * scale_y))

    detections = []
    for (vx1, vy1, vx2, vy2), vehicle_type, vehicle_conf in detect_vehicles(processed):
        vehicle_crop = crop(processed, (vx1, vy1, vx2, vy2))
        if vehicle_crop.size == 0:
            continue

        color_name = get_dominant_color(vehicle_crop)

        plate_text, abs_plate_box = "", None
        for px1, py1, px2, py2 in detect_plates(vehicle_crop):
            abs_box = (vx1 + px1, vy1 + py1, vx1 + px2, vy1 + py2)
            plate_crop_img = crop(processed, abs_box, pad=4)
            if plate_crop_img.size == 0:
                continue
            plate_text = extract_plate_text(plate_crop_img, verbose=verbose)
            abs_plate_box = abs_box
            break  # one plate per vehicle is enough for this use case

        # Overall confidence = the vehicle detector's own confidence, scaled
        # down unless the plate text also passes Indian-format structural
        # validation - a real (if coarse) signal rather than a fabricated
        # number, without re-plumbing OCR's own per-character confidence
        # through the retry loop in text_extraction.py.
        if plate_text:
            _, structurally_valid, _ = structural_correct(plate_text)
            confidence = vehicle_conf * (0.97 if structurally_valid else 0.72)
        else:
            confidence = vehicle_conf * 0.3

        detections.append({
            "vehicle_box": to_original((vx1, vy1, vx2, vy2)),
            "plate_box": to_original(abs_plate_box) if abs_plate_box else None,
            "vehicle_type": vehicle_type,
            "color": color_name,
            "plate_text": plate_text,
            "confidence": round(min(confidence, 0.99), 3),
        })

    return detections


def draw_overlay(frame, detections):
    """Draws a green box around each vehicle and a red box around its plate."""
    for det in detections:
        vx1, vy1, vx2, vy2 = det["vehicle_box"]
        cv2.rectangle(frame, (vx1, vy1), (vx2, vy2), (0, 255, 0), 2)

        if det["plate_box"]:
            px1, py1, px2, py2 = det["plate_box"]
            cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 0, 255), 2)

        label = det["plate_text"] if det["plate_text"] else "?"
        cv2.putText(frame, label, (vx1, max(0, vy1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)

    return frame
