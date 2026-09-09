"""
vehicle_detector.py

Vehicle detection using a free pretrained YOLOv8 model (COCO classes).
No training required - the weights auto-download on first run.
"""

from ultralytics import YOLO

from config import VEHICLE_MODEL_NAME, VEHICLE_CLASS_IDS, VEHICLE_CONF_THRESH, VEHICLE_TYPE_NAMES

_vehicle_model = None


def get_vehicle_model():
    global _vehicle_model
    if _vehicle_model is None:
        _vehicle_model = YOLO(VEHICLE_MODEL_NAME)
    return _vehicle_model


def detect_vehicles(image):
    """
    Run the pretrained COCO YOLOv8 model and return a list of
    (box, vehicle_type, confidence) tuples, where box is (x1, y1, x2, y2)
    and confidence is the model's own detection confidence (0-1).
    """
    model = get_vehicle_model()
    results = model(image, classes=VEHICLE_CLASS_IDS, conf=VEHICLE_CONF_THRESH, verbose=False)[0]

    detections = []
    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        vehicle_type = VEHICLE_TYPE_NAMES.get(int(box.cls[0]), "Vehicle")
        confidence = float(box.conf[0])
        detections.append(((x1, y1, x2, y2), vehicle_type, confidence))
    return detections
