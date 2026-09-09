"""
preprocessing.py

Frame-level pre-processing (before vehicle detection) and plate-level
pre-processing (before OCR): adaptive resize, gamma correction, deskew,
CLAHE contrast, and blur-aware sharpening.
"""

import cv2
import numpy as np

from config import MAX_FRAME_DIM, ENABLE_FRAME_DENOISE


def preprocess_image(image, max_dim=MAX_FRAME_DIM, denoise=ENABLE_FRAME_DENOISE):
    """
    Only downscales if the image exceeds `max_dim` on its longest side
    (never upscales). Denoising is opt-in since it costs time without
    reliably improving detection.
    """
    h, w = image.shape[:2]
    scale = min(1.0, max_dim / float(max(h, w)))
    if scale < 1.0:
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    if denoise:
        image = cv2.fastNlMeansDenoisingColored(image, None, 5, 5, 7, 21)
    return image


def crop(image, box, pad=0):
    """Crop a box out of an image, with optional pixel padding on every side."""
    x1, y1, x2, y2 = box
    h, w = image.shape[:2]
    x1, y1 = max(0, x1 - pad), max(0, y1 - pad)
    x2, y2 = min(w, x2 + pad), min(h, y2 + pad)
    return image[y1:y2, x1:x2]


def estimate_blur(gray):
    """Laplacian variance: lower = blurrier. Used to scale sharpening adaptively."""
    return cv2.Laplacian(gray, cv2.CV_64F).var()


def auto_gamma_correct(gray):
    """Push mean brightness toward mid-gray - handles both dark and glare-heavy plates."""
    mean_brightness = gray.mean()
    if mean_brightness <= 1 or mean_brightness >= 254:
        return gray
    gamma = np.log(0.5) / np.log(mean_brightness / 255.0)
    gamma = float(np.clip(gamma, 0.5, 2.5))
    inv_gamma = 1.0 / gamma
    table = (np.arange(256) / 255.0) ** inv_gamma * 255
    return cv2.LUT(gray, table.astype("uint8"))


def deskew_plate(gray, max_angle=15):
    """Correct small rotation using the largest contour's minAreaRect angle."""
    try:
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return gray
        largest = max(contours, key=cv2.contourArea)
        angle = cv2.minAreaRect(largest)[-1]
        if angle < -45:
            angle += 90
        if abs(angle) > max_angle:
            return gray
        h, w = gray.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    except cv2.error:
        return gray


def preprocess_plate(plate_img, target_height=150, clip_limit=2.5, sharpen_amount=0.5):
    """
    Clean up a cropped plate image before OCR: adaptive resize (only
    upscales small crops), auto gamma correction, deskew, CLAHE contrast,
    and blur-aware sharpening (blurry crops get sharpened harder,
    already-crisp ones barely touched).
    """
    gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)

    h, w = gray.shape[:2]
    if h < target_height:
        scale = target_height / float(h)
        gray = cv2.resize(gray, (max(1, int(w * scale)), target_height), interpolation=cv2.INTER_LANCZOS4)
    elif h > target_height * 2:
        scale = (target_height * 1.5) / float(h)
        gray = cv2.resize(gray, (max(1, int(w * scale)), int(h * scale)), interpolation=cv2.INTER_AREA)

    gray = auto_gamma_correct(gray)
    gray = deskew_plate(gray)

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    blur_metric = estimate_blur(gray)
    dynamic_sharpen = sharpen_amount * float(np.clip(150.0 / max(blur_metric, 1.0), 0.5, 2.5))
    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=2)
    gray = cv2.addWeighted(gray, 1 + dynamic_sharpen, blurred, -dynamic_sharpen, 0)

    gray = cv2.bilateralFilter(gray, 5, 50, 50)
    return gray
