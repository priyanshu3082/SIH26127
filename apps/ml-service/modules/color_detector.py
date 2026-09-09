"""
color_detector.py

Fast CV-only vehicle color estimation via k-means clustering + HSV-based
rule classification. Color doesn't need a language model, so this stays
a cheap heuristic rather than spending an API call on it.

Classification is done in HSV rather than by nearest-neighbor distance in
raw BGR: hue captures the actual paint color and is largely independent
of brightness, whereas raw BGR distance is very sensitive to lighting
(glare, shadows, dusk/night footage) - that sensitivity was the main
cause of colors being misread or missed under real-world conditions.
"""

import cv2
import numpy as np


def _classify_hsv(h, s, v):
    """
    h: OpenCV hue, 0-179. s, v: 0-255.

    Brightness alone does NOT mean "Black" - a dark red (e.g. maroon, or
    red paint in shadow) has low V but high S, and should still classify
    as Red. Only pixels that are both dark AND desaturated are truly
    achromatic black; near-total darkness (v < 15) is treated as black
    regardless of saturation since no hue is reliably readable there.
    """
    if v < 15:
        return "Black"

    if s < 40:
        if v < 50:
            return "Black"
        elif v > 200:
            return "White"
        elif v > 130:
            return "Silver"
        else:
            return "Gray"

    # From here there is real color signal (s >= 40), even if it's dark -
    # classify by hue rather than falling back to Black/Gray.
    if h < 10 or h >= 170:
        return "Red"
    if h < 20:
        return "Brown" if v < 150 else "Orange"
    if h < 33:
        return "Yellow"
    if h < 85:
        return "Green"
    if h < 130:
        return "Blue"
    # 130-170: purples/magentas aren't in our vocabulary - fall back to
    # whichever named color they sit closer to.
    return "Blue" if h < 150 else "Red"


def get_dominant_color(vehicle_crop, k=3):
    """
    Estimate the vehicle's dominant color via k-means on a sampled patch,
    then classify the dominant cluster's color in HSV.

    The sample region is biased toward the lower-center of the crop and
    away from the top - the top of a vehicle crop (roof/windshield/sky)
    is much more likely to be dark glass or background than actual paint,
    and was a common cause of colors being read wrong.
    """
    h, w = vehicle_crop.shape[:2]
    if h < 8 or w < 8:
        return "Unknown"

    y0, y1 = int(h * 0.40), int(h * 0.90)
    x0, x1 = int(w * 0.15), int(w * 0.85)
    patch = vehicle_crop[y0:y1, x0:x1]
    if patch.size == 0:
        patch = vehicle_crop

    small = cv2.resize(patch, (40, 40), interpolation=cv2.INTER_AREA)
    pixels = small.reshape(-1, 3).astype(np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_RANDOM_CENTERS)
    counts = np.bincount(labels.flatten())
    dominant_bgr = centers[np.argmax(counts)].astype(np.uint8).reshape(1, 1, 3)

    dominant_hsv = cv2.cvtColor(dominant_bgr, cv2.COLOR_BGR2HSV)[0, 0]
    h_val, s_val, v_val = int(dominant_hsv[0]), int(dominant_hsv[1]), int(dominant_hsv[2])

    return _classify_hsv(h_val, s_val, v_val)