"""
frame_extractor.py

Extracts every frame from a video file into a folder, one JPEG per frame.
This is the raw "store all the frames" step - it happens before any
detection/processing, and always saves every single decoded frame
regardless of PROCESS_EVERY_NTH_FRAME (that setting only affects which of
these extracted frames get run through detection later).
"""

import os
import cv2


def extract_frames(video_path, frames_dir):
    """
    Decode every frame of `video_path` and save it to `frames_dir` as
    frame_00001.jpg, frame_00002.jpg, ...

    Returns (fps, width, height, frame_paths) where frame_paths is the
    ordered list of saved file paths.
    """
    os.makedirs(frames_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frame_paths = []
    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        idx += 1
        path = os.path.join(frames_dir, f"frame_{idx:05d}.jpg")
        cv2.imwrite(path, frame)
        frame_paths.append(path)

    cap.release()
    print(f"Extracted {len(frame_paths)} frames to '{frames_dir}/' ({width}x{height} @ {fps:.2f} fps)")
    return fps, width, height, frame_paths
