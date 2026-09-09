"""
main.py - CLI entry point for the ALPR pipeline.

Usage:
  Video:  python main.py --video path/to/input.mp4
  Image:  python main.py --image path/to/photo.jpg

Video mode:
  1. Every frame is decoded and saved to FRAMES_DIR (config.py) - the raw
     "store all the frames" step.
  2. Every Nth extracted frame (PROCESS_EVERY_NTH_FRAME in config.py) is
     run through detection, and its annotated image + a details .txt file
     are saved to OUTPUT_DIR as boundedimg1.jpg/.txt, boundedimg2.jpg/.txt, ...

Image mode:
  Runs detection once and saves a single boundedimg1.jpg/.txt pair to
  OUTPUT_DIR.
"""

import argparse
import os
import cv2

import config
from modules.frame_extractor import extract_frames
from modules.pipeline import detect_and_read, draw_overlay
from modules.output_writer import save_bounded_output


def process_image(image_path, output_dir, verbose=False):
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")

    detections = detect_and_read(image, verbose=verbose)
    draw_overlay(image, detections)

    jpg_path, txt_path = save_bounded_output(
        output_dir, index=1, annotated_frame=image, detections=detections,
        source_frame_name=os.path.basename(image_path), frame_index=0,
    )
    print(f"Saved {jpg_path} and {txt_path}")
    for i, det in enumerate(detections, 1):
        print(f"  Vehicle {i}: type={det['vehicle_type']!r} plate={det['plate_text']!r} color={det['color']!r}")


def process_video(video_path, frames_dir, output_dir, process_every_nth, verbose=False):
    # Step 1: extract and store every frame.
    fps, width, height, frame_paths = extract_frames(video_path, frames_dir)

    # Step 2: run detection on every Nth extracted frame, saving bounded
    # image + details .txt for each one processed.
    bounded_index = 0
    for frame_idx, frame_path in enumerate(frame_paths, start=1):
        if (frame_idx - 1) % process_every_nth != 0:
            continue

        frame = cv2.imread(frame_path)
        if frame is None:
            print(f"Warning: could not read {frame_path}, skipping")
            continue

        detections = detect_and_read(frame, verbose=verbose)
        draw_overlay(frame, detections)

        bounded_index += 1
        jpg_path, txt_path = save_bounded_output(
            output_dir, index=bounded_index, annotated_frame=frame, detections=detections,
            source_frame_name=os.path.basename(frame_path), frame_index=frame_idx,
        )
        print(f"[{bounded_index}] {frame_path} -> {jpg_path}, {txt_path} "
              f"({len(detections)} vehicle(s))")

    print(f"\nDone. Processed {bounded_index} of {len(frame_paths)} extracted frames "
          f"(every {process_every_nth}th frame).")
    print(f"Raw frames:      {frames_dir}/")
    print(f"Bounded outputs: {output_dir}/")


def main():
    parser = argparse.ArgumentParser(description="ALPR pipeline: detect vehicles, plates, color, and read plate text.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--video", help="Path to an input video file")
    group.add_argument("--image", help="Path to a single input image")

    parser.add_argument("--frames-dir", default=config.FRAMES_DIR, help="Folder to store all extracted video frames")
    parser.add_argument("--output-dir", default=config.OUTPUT_DIR, help="Folder to store bounded images + detail .txt files")
    parser.add_argument("--every-nth", type=int, default=config.PROCESS_EVERY_NTH_FRAME,
                         help="Only run detection on every Nth extracted frame (video mode only)")
    parser.add_argument("--verbose", action="store_true", help="Print per-attempt OCR/LLM debug info")

    args = parser.parse_args()

    if args.video:
        process_video(args.video, args.frames_dir, args.output_dir, args.every_nth, verbose=args.verbose)
    else:
        process_image(args.image, args.output_dir, verbose=args.verbose)


if __name__ == "__main__":
    main()
