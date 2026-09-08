"""Manual demo entrypoint.

Usage (run from inside trajectory-engine/):
    python -m trajectory.cli --plate KA01AB1234 --case-id CASE-001 --visualize
    python -m trajectory.cli --fleet 15 --case-id CASE-001
"""
import argparse

from trajectory import db
from trajectory.matching.candidates import distinct_observed_plates
from trajectory.pipeline import reconstruct_trajectory


def _print_trajectory(trajectory):
    print(f"Plate: {trajectory.plate}")
    print(f"Overall confidence: {trajectory.confidence:.2f}")
    if not trajectory.stops:
        print("  (no candidate sightings found)")
    for stop in trajectory.stops:
        marker = " [CHAIN BREAK]" if stop.is_chain_break else ""
        print(f"  {stop.camera_id} @ ts={stop.ts:.0f} conf={stop.confidence:.2f}{marker}")


def main():
    parser = argparse.ArgumentParser(description="Trajectory reconstruction demo")
    parser.add_argument("--plate", help="reconstruct a single plate")
    parser.add_argument("--fleet", type=int, metavar="N",
                         help="reconstruct N distinct observed plates and plot them together")
    parser.add_argument("--case-id", required=True)
    parser.add_argument("--visualize", action="store_true", help="write an HTML map of the result")
    args = parser.parse_args()

    if not args.plate and not args.fleet:
        parser.error("pass --plate <plate> or --fleet <N>")
    if args.plate and args.fleet:
        parser.error("pass --plate or --fleet, not both")

    with db.connection() as conn:
        if args.plate:
            trajectory = reconstruct_trajectory(conn, args.plate, args.case_id)
            _print_trajectory(trajectory)

            if args.visualize and trajectory.stops:
                from trajectory.visualize import plot_trajectory
                out_path = plot_trajectory(conn, trajectory)
                print(f"Map saved to {out_path}")

        else:
            plates = distinct_observed_plates(conn, limit=args.fleet)
            trajectories = [reconstruct_trajectory(conn, plate, args.case_id) for plate in plates]
            with_stops = [t for t in trajectories if t.stops]

            print(f"Reconstructed {len(with_stops)}/{len(plates)} vehicles with at least one stop.")
            for trajectory in with_stops:
                _print_trajectory(trajectory)
                print()

            if with_stops:
                from trajectory.visualize import plot_multiple_trajectories
                out_path = plot_multiple_trajectories(conn, with_stops)
                print(f"Fleet map saved to {out_path} - use the search box on the page to isolate one plate.")


if __name__ == "__main__":
    main()
