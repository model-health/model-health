#!/usr/bin/env python3
"""Model Health Python SDK — capture workflow demo.

Walks through the full capture workflow:
  1. Create a session (QR code saved locally for pairing)
  2. Select an existing subject or create a new one
  3. Calibrate cameras using a checkerboard pattern
  4. Calibrate the subject (neutral standing pose)
  5. Record a movement activity
  6. Wait for activity upload and processing

Requires cameras to be connected and ready via the Model Health companion iOS app.

Usage:
    activity_recording.py [<api_key>]
"""

import os
import sys
import time
import urllib.request

from docopt import docopt

from modelhealth import (
    ActivityStatus,
    ActivityStatusUploading,
    CalibrationStatus,
    CalibrationStatusProcessing,
    CalibrationStatusUploading,
    CheckerboardDetails,
    CheckerboardPlacement,
    ModelHealthError,
    ModelHealthService,
    SubjectParameters,
)
from _prompts import confirm, pick_one
from _utils import DOWNLOADS_DIR, load_api_key

# ---------------------------------------------------------------------------
# Checkerboard presets
# ---------------------------------------------------------------------------

_CHECKERBOARD_PRESETS = [
    (4, 5, 35, "4 × 5  —  35 mm squares  (standard A4)"),
    (4, 5, 50, "4 × 5  —  50 mm squares  (large A3)"),
    (None, None, None, "Other — enter manually"),
]

# ---------------------------------------------------------------------------
# Calibration callback
# ---------------------------------------------------------------------------

_CB_WIDTH = 48


def _calibration_callback(status):
    if isinstance(status, CalibrationStatusUploading):
        msg = f"  Uploading ({status.uploaded}/{status.total} cameras)..."
        print(msg.ljust(_CB_WIDTH), end="\r", flush=True)
    elif isinstance(status, CalibrationStatusProcessing):
        pct = f"{status.percent}%" if status.percent is not None else "--%"
        msg = f"  Processing ({pct})..."
        print(msg.ljust(_CB_WIDTH), end="\r", flush=True)
    elif status == CalibrationStatus.recording:
        print("  Recording...".ljust(_CB_WIDTH), end="\r", flush=True)
    elif status == CalibrationStatus.done:
        print("  Done.".ljust(_CB_WIDTH))


# ---------------------------------------------------------------------------
# Activity polling helper
# ---------------------------------------------------------------------------

def _poll_activity(service, activity, interval=5):
    """Block until the activity finishes uploading and processing."""
    while True:
        status = service.activity_status(activity)
        if isinstance(status, ActivityStatusUploading):
            print(
                f"  Uploading ({status.uploaded}/{status.total} cameras)...  ",
                end="\r", flush=True,
            )
        elif status == ActivityStatus.processing:
            print("  Processing...                              ", end="\r", flush=True)
        else:
            print()
            return status
        time.sleep(interval)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    print("Connecting...")
    try:
        service = ModelHealthService(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")

    # Session
    print("\nCreating session...")
    try:
        session = service.create_session()
    except ModelHealthError as exc:
        sys.exit(f"Failed to create session: {exc}")
    print(f"  Session ID: {session.id}")

    if not session.qrcode:
        sys.exit("Session has no QR code — cannot pair cameras.")

    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    qr_path = os.path.join(DOWNLOADS_DIR, "qr-code.png")
    try:
        urllib.request.urlretrieve(session.qrcode, qr_path)
        print(f"  QR code saved to: {qr_path}")
    except Exception as exc:
        sys.exit(f"Failed to download QR code: {exc}")

    print("  Pair your cameras using the Model Health companion iOS app before continuing.")
    input("\nPress Enter when cameras are ready...")

    # Camera calibration
    print("\nCheckerboard configuration:\n")
    preset = pick_one(
        _CHECKERBOARD_PRESETS,
        "Select checkerboard",
        lambda p: p[3],
    )
    rows, columns, square_size, _ = preset

    if rows is None:
        rows        = int(input("  Internal rows: ").strip())
        columns     = int(input("  Internal columns: ").strip())
        square_size = int(input("  Square size (mm): ").strip())

    print("\nCheckerboard placement:\n")
    placement_value, _ = pick_one(
        [
            (CheckerboardPlacement.perpendicular, "Perpendicular (upright, facing cameras)"),
            (CheckerboardPlacement.parallel,      "Parallel (flat on the floor)"),
        ],
        "Select placement",
        lambda p: p[1],
    )

    checkerboard = CheckerboardDetails(
        rows=rows,
        columns=columns,
        square_size=square_size,
        placement=placement_value,
    )

    input("\nPress Enter to start camera calibration...")
    print("Calibrating cameras...")
    try:
        service.calibrate_camera(session, checkerboard, _calibration_callback)
    except ModelHealthError as exc:
        sys.exit(f"Camera calibration failed: {exc}")
    print("Camera calibration complete.")

    # Subject
    print("\nFetching subjects...")
    try:
        subjects = service.subject_list()
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch subjects: {exc}")

    if subjects and confirm(f"Found {len(subjects)} subject(s). Select an existing one?", default=True):
        print()
        subject = pick_one(
            subjects,
            "Select subject",
            lambda s: f"{s.name}  (ID {s.id})",
        )
        print(f"  Using: {subject.name}")
    else:
        print("\nNew subject details:")
        name   = input("  Name: ").strip() or "Anonymous"
        weight = float(input("  Weight (kg): ").strip())
        height = float(input("  Height (cm): ").strip())

        params = SubjectParameters(name=name, weight=weight, height=height)
        print("Creating subject...")
        try:
            subject = service.create_subject(params)
        except ModelHealthError as exc:
            sys.exit(f"Failed to create subject: {exc}")
        print(f"  Subject created: {subject.name} (ID {subject.id})")

    # Subject calibration
    input(f"\nAsk {subject.name} to stand in the neutral pose, then press Enter...")
    print("Calibrating subject...")
    try:
        service.calibrate_subject(subject, session, _calibration_callback)
    except ModelHealthError as exc:
        sys.exit(f"Subject calibration failed: {exc}")
    print("Subject calibration complete.")

    # Recording
    activity_name = input("\nActivity name (e.g. cmj, squat): ").strip() or "activity"

    input(f"\nAsk {subject.name} to get ready, then press Enter to start recording...")
    print("Recording...")
    try:
        activity = service.start_recording(activity_name, session)
    except ModelHealthError as exc:
        sys.exit(f"Failed to start recording: {exc}")
    print(f"  Recording started (activity {activity.id}).")

    input("\nPress Enter when the movement is complete to stop recording...")
    print("Stopping recording...")
    try:
        service.stop_recording(session)
    except ModelHealthError as exc:
        sys.exit(f"Failed to stop recording: {exc}")
    print("Recording stopped. Videos are uploading.")

    # Wait for processing
    print("\nWaiting for upload and processing...")
    status = _poll_activity(service, activity)
    if status != ActivityStatus.ready:
        sys.exit(f"Activity did not reach ready state (status: {status}).")
    print(f"Activity is ready. ID: {activity.id}")
    print("\nDone. Run activity_analysis.py to analyze this activity.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
