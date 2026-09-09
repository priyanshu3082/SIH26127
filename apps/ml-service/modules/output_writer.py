"""
output_writer.py

Saves each processed frame's annotated (bounded-box) image alongside a
human-readable .txt file listing every vehicle detected in it:

  output/
    boundedimg1.jpg
    boundedimg1.txt
    boundedimg2.jpg
    boundedimg2.txt
    ...
"""

import os
import cv2


def format_detection_txt(source_frame_name, frame_index, detections):
    lines = [
        f"Source frame: {source_frame_name}",
        f"Frame index: {frame_index}",
        f"Vehicles detected: {len(detections)}",
        "",
    ]

    if not detections:
        lines.append("(no vehicles detected in this frame)")
        return "\n".join(lines)

    for i, det in enumerate(detections, 1):
        lines.append(f"Vehicle {i}:")
        lines.append(f"  Type: {det['vehicle_type']}")
        lines.append(f"  Plate Number: {det['plate_text'] or '(not read)'}")
        lines.append(f"  Color: {det['color']}")
        lines.append(f"  Vehicle BBox (x1,y1,x2,y2): {det['vehicle_box']}")
        lines.append(f"  Plate BBox (x1,y1,x2,y2): {det['plate_box'] or 'N/A'}")
        lines.append("")

    return "\n".join(lines)


def save_bounded_output(output_dir, index, annotated_frame, detections, source_frame_name, frame_index):
    """
    Writes boundedimg{index}.jpg and boundedimg{index}.txt to `output_dir`.
    Returns (jpg_path, txt_path).
    """
    os.makedirs(output_dir, exist_ok=True)

    jpg_path = os.path.join(output_dir, f"boundedimg{index}.jpg")
    txt_path = os.path.join(output_dir, f"boundedimg{index}.txt")

    cv2.imwrite(jpg_path, annotated_frame)
    with open(txt_path, "w") as f:
        f.write(format_detection_txt(source_frame_name, frame_index, detections))

    return jpg_path, txt_path
