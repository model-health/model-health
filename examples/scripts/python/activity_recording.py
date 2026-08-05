#!/usr/bin/env python3
"""Model Health Python SDK — capture workflow demo.

Walks through the full capture workflow:
  1. Create a session (QR code saved locally for pairing)
  2. Select an existing subject or create a new one
  3. Calibrate cameras using a checkerboard pattern
  4. Calibrate the subject (neutral standing pose)
  5. Record one or more movement activities in a loop
  6. For each activity: wait for upload/processing, optionally run analysis,
     then optionally update activity metadata
  7. After each activity, choose to record another or quit

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
    ActivityConfig,
    ActivityStatus,
    ActivityStatusAnalyzing,
    ActivityStatusUploading,
    ActivityType,
    AnalysisDataType,
    AnalysisStatus,
    CalibrationStatus,
    CalibrationStatusProcessing,
    CalibrationStatusUploading,
    CheckerboardDetails,
    CheckerboardPlacement,
    FilterFrequencyHz,
    ModelHealthError,
    ModelHealthClient,
    RecordingConfig,
    SessionFramerate,
    SubjectParameters,
)
from _prompts import confirm, pick_one
from _utils import ANALYSIS_DATA_EXT, DOWNLOADS_DIR, load_api_key, poll_analysis, save_file

# ---------------------------------------------------------------------------
# Activity type options for automatic analysis after recording
# ---------------------------------------------------------------------------

_ACTIVITY_TYPES = [
    (None,                               "None — skip automatic analysis"),
    (ActivityType.counter_movement_jump, "Counter Movement Jump"),
    (ActivityType.gait,                  "Overground Walking"),
    (ActivityType.treadmill_gait,        "Treadmill Walking"),
    (ActivityType.treadmill_running,     "Treadmill Running"),
    (ActivityType.overground_running,    "Overground Running"),
    (ActivityType.sit_to_stand,          "Sit-to-Stand Transfer"),
    (ActivityType.squats,                "Squats"),
    (ActivityType.range_of_motion,       "Range of Motion"),
    (ActivityType.drop_jump,             "Drop Vertical Jump"),
    (ActivityType.hop,                   "Hop Test"),
    (ActivityType.change_of_direction,   "5-0-5 Test"),
    (ActivityType.cut,                   "Cutting Maneuver"),
    (ActivityType.sprint,                "Sprint"),
    (ActivityType.lateral_stepdown,      "Lateral Step Down"),
    (ActivityType.lunge,                 "Lunge"),
]

# ---------------------------------------------------------------------------
# Per-recording config options
# ---------------------------------------------------------------------------

_FRAMERATES = [
    (None,                     "Default"),
    (SessionFramerate.fps_60,  "60 fps"),
    (SessionFramerate.fps_120, "120 fps"),
    (SessionFramerate.fps_240, "240 fps"),
]

_FILTER_FREQUENCIES = [
    (None,                   "Default"),
    (FilterFrequencyHz(6),   "6 Hz"),
    (FilterFrequencyHz(10),  "10 Hz"),
    (FilterFrequencyHz(20),  "20 Hz"),
]

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

def _poll_activity(client, activity, interval=5):
    """Block until the activity finishes uploading and processing."""
    while True:
        status = client.activity_status(activity)
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
# Setup
# ---------------------------------------------------------------------------

def _connect(api_key):
    print("Connecting...")
    try:
        return ModelHealthClient(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


# ---------------------------------------------------------------------------
# Session / camera pairing
# ---------------------------------------------------------------------------

def _create_session_and_save_qr_code(client):
    print("\nCreating session...")
    try:
        session = client.create_session()
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

    return session


def _wait_for_camera_pairing():
    print("  Pair your cameras using the Model Health companion iOS app before continuing.")
    input("\nPress Enter when cameras are ready...")


# ---------------------------------------------------------------------------
# Camera calibration
# ---------------------------------------------------------------------------

def _configure_checkerboard():
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

    return CheckerboardDetails(
        rows=rows,
        columns=columns,
        square_size=square_size,
        placement=placement_value,
    )


def _calibrate_cameras(client, session, checkerboard):
    input("\nPress Enter to start camera calibration...")
    print("Calibrating cameras...")
    try:
        client.calibrate_camera(session, checkerboard, _calibration_callback)
    except ModelHealthError as exc:
        sys.exit(f"Camera calibration failed: {exc}")
    print("Camera calibration complete.")


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

def _pick_or_create_subject(client):
    print("\nFetching subjects...")
    try:
        subjects = client.subject_list()
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
        return subject

    print("\nNew subject details:")
    name   = input("  Name: ").strip() or "Anonymous"
    weight = float(input("  Weight (kg): ").strip())
    height = float(input("  Height (cm): ").strip())

    params = SubjectParameters(name=name, weight=weight, height=height)
    print("Creating subject...")
    try:
        subject = client.create_subject(params)
    except ModelHealthError as exc:
        sys.exit(f"Failed to create subject: {exc}")
    print(f"  Subject created: {subject.name} (ID {subject.id})")
    return subject


def _calibrate_subject(client, subject, session):
    input(f"\nAsk {subject.name} to stand in the neutral pose, then press Enter...")
    print("Calibrating subject...")
    try:
        client.calibrate_subject(subject, session, _calibration_callback)
    except ModelHealthError as exc:
        sys.exit(f"Subject calibration failed: {exc}")
    print("Subject calibration complete.")


# ---------------------------------------------------------------------------
# Single recording loop iteration
# ---------------------------------------------------------------------------

def _prompt_recording_config():
    """Returns (activity_name, activity_type_value, activity_type_label, recording_config)."""
    activity_name = input("\nActivity name (e.g. cmj, squat): ").strip() or "activity"

    print("\nAutomatic analysis (optional):\n")
    activity_type_value, activity_type_label = pick_one(
        _ACTIVITY_TYPES,
        "Select activity type",
        lambda t: t[1],
    )

    print("\nFramerate override (optional):\n")
    framerate_value, _ = pick_one(_FRAMERATES, "Select framerate", lambda t: t[1])

    print("\nFilter frequency override (optional):\n")
    filter_value, _ = pick_one(_FILTER_FREQUENCIES, "Select filter frequency", lambda t: t[1])

    recording_config = None
    if framerate_value is not None or filter_value is not None:
        recording_config = RecordingConfig(framerate=framerate_value, filter_frequency=filter_value)

    return activity_name, activity_type_value, activity_type_label, recording_config


def _start_recording(client, session, subject, activity_name, activity_type_value, recording_config):
    input(f"\nAsk {subject.name} to get ready, then press Enter to start recording...")
    print("Recording...")
    try:
        activity = client.start_recording(
            activity_name,
            session,
            ActivityConfig(activity_type=activity_type_value, config=recording_config)
        )
    except ModelHealthError as exc:
        print(f"Failed to start recording: {exc}")
        return None

    print(f"  Recording started (activity {activity.id}).")
    return activity


def _stop_recording(client, session):
    input("\nPress Enter when the movement is complete to stop recording...")
    print("Stopping recording...")
    try:
        client.stop_recording(session)
    except ModelHealthError as exc:
        print(f"Failed to stop recording: {exc}")
        return False

    print("Recording stopped. Videos are uploading.")
    return True


def _wait_and_process_results(client, activity, activity_type_label):
    """Waits for upload/processing and, if automatic analysis was requested,
    waits for it to complete and downloads the report.

    Always returns the activity (fresh, if analysis ran and completed).
    """
    print("\nWaiting for upload and processing...")
    status = _poll_activity(client, activity)

    if isinstance(status, ActivityStatusAnalyzing):
        return _wait_for_analysis_and_download_report(client, activity, status.task, activity_type_label)
    elif status == ActivityStatus.ready:
        print(f"Activity is ready. ID: {activity.id}")
        print("Run activity_analysis.py to analyze this activity.")
        return activity
    else:
        print(f"Activity did not reach ready state (status: {status}).")
        return activity


def _wait_for_analysis_and_download_report(client, activity, task, activity_type_label):
    print(f"Activity is ready. Automatic '{activity_type_label}' analysis has started.")
    print("\nWaiting for analysis to complete...")
    result_status = poll_analysis(client, task)
    if result_status != AnalysisStatus.completed:
        print(f"Analysis did not complete (status: {result_status}).")
        return activity

    print("Analysis complete.")
    activity = client.fetch_activity(activity.id)
    results = client.analysis_data_for_activity(activity, [AnalysisDataType.report])
    slug = (activity.name or activity.id).replace(" ", "_")
    print("\nDownloading report...")
    for r in results:
        ext = ANALYSIS_DATA_EXT.get(r.type, "bin")
        path = save_file(f"{slug}_{r.type}.{ext}", r.data)
        print(f"  Saved {path}")

    return activity


def _update_activity_metadata(client, activity):
    # Re-fetch first: analysis auto-generates tags server-side, and update_activity
    # merges add/remove_tags on top of the local activity's tags. Without a fresh
    # fetch, the merge starts from a stale tag set and wipes the auto-generated tags.
    try:
        activity = client.fetch_activity(activity.id)
    except ModelHealthError as exc:
        print(f"Failed to refresh activity: {exc}")

    print("\nUpdate activity (optional):")
    current_tags = ", ".join(activity.tags) if activity.tags else "(none)"
    print(f"  Current tags: {current_tags}")

    new_name = input(f"  New name (press Enter to keep '{activity.name or activity.id}'): ").strip() or None

    add_input = input("  Tags to add, comma-separated (press Enter to skip): ").strip()
    add_tags = [t.strip() for t in add_input.split(",") if t.strip()] if add_input else []

    remove_input = input("  Tags to remove, comma-separated (press Enter to skip): ").strip()
    remove_tags = [t.strip() for t in remove_input.split(",") if t.strip()] if remove_input else []

    if new_name or add_tags or remove_tags:
        print("Updating activity...")
        try:
            activity = client.update_activity(
                activity,
                ActivityConfig(name=new_name, add_tags=add_tags, remove_tags=remove_tags),
            )
        except ModelHealthError as exc:
            print(f"Failed to update activity: {exc}")
        else:
            print(f"  Updated: {activity.name or activity.id}")

    return activity


def _record_one(client, session, subject):
    """Run a single record → process → (optionally analyse) → (optionally update) cycle.

    Returns True to continue recording, False to quit.
    """
    activity_name, activity_type_value, activity_type_label, recording_config = _prompt_recording_config()

    activity = _start_recording(client, session, subject, activity_name, activity_type_value, recording_config)
    if activity is None:
        return confirm("\nRecord another activity?", default=True)

    if not _stop_recording(client, session):
        return confirm("\nRecord another activity?", default=True)

    activity = _wait_and_process_results(client, activity, activity_type_label)
    _update_activity_metadata(client, activity)

    return confirm("\nRecord another activity?", default=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    client = _connect(api_key)

    session = _create_session_and_save_qr_code(client)
    _wait_for_camera_pairing()

    checkerboard = _configure_checkerboard()
    _calibrate_cameras(client, session, checkerboard)

    while True:
        subject = _pick_or_create_subject(client)
        _calibrate_subject(client, subject, session)

        # Recording loop
        while _record_one(client, session, subject):
            pass

        if not confirm("\nCalibrate another subject with the same camera setup?", default=True):
            break
        session = client.new_session_from_session(session)

    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
