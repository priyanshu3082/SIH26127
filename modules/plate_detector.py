"""
plate_detector.py

License plate detection using your own custom-trained YOLOv8 model.
"""

from ultralytics import YOLO

from config import PLATE_MODEL_PATH, PLATE_CONF_THRESH

_plate_model = None


def get_plate_model():
    global _plate_model
    if _plate_model is None:
        _plate_model = YOLO(PLATE_MODEL_PATH)
    return _plate_model


def detect_plates(image):
    """Run the custom plate model and return a list of boxes (x1, y1, x2, y2)."""
    model = get_plate_model()
    results = model(image, conf=PLATE_CONF_THRESH, verbose=False)[0]

    boxes = []
    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        boxes.append((x1, y1, x2, y2))
    return boxes
