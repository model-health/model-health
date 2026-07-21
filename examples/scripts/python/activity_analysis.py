#!/usr/bin/env python3
"""Model Health Python SDK — interactive CLI demo.

Walks through the post-capture workflow:
  1. Select a session
  2. Select an activity from that session
  3. Wait for processing to complete (if needed)
  4. Choose an analysis type and run it
  5. Choose which result files to save (report PDF, data ZIP)

Usage:
    activity_analysis.py [<api_key>]
"""

import sys
import time

from docopt import docopt

from modelhealth import (
    ModelHealthService,
    ModelHealthError,
    ActivityStatus,
    ActivityStatusUploading,
    AnalysisStatus,
    ActivityType,
    AnalysisDataType,
)
from _prompts import pick_one, pick_multi
from _utils import save_file, ANALYSIS_DATA_EXT, load_api_key, poll_analysis

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ANALYSIS_TYPES = [
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

RESULT_TYPES = [
    (AnalysisDataType.report,  "Report   (PDF) "),
    (AnalysisDataType.data,    "Data     (ZIP) "),
]


# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}

# ---------------------------------------------------------------------------
# Polling helpers
# ---------------------------------------------------------------------------

def _poll_processing(service, activity, interval=10):
    """Block until the activity finishes uploading and processing.

    Returns the final status (ActivityStatus.ready or ActivityStatus.failed).
    """
    while True:
        status = service.activity_status(activity)
        if isinstance(status, ActivityStatusUploading):
            print(f"  Uploading ({status.uploaded}/{status.total} cameras)...  ", end="\r", flush=True)
        elif status == ActivityStatus.processing:
            print("  Processing...                              ", end="\r", flush=True)
        else:
            print()  # clear the \r line
            return status
        time.sleep(interval)


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

def _connect(api_key):
    print("Connecting...")
    try:
        return ModelHealthService(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


# ---------------------------------------------------------------------------
# Session / activity selection
# ---------------------------------------------------------------------------

def _pick_session(service):
    print("\nFetching sessions...")
    sessions = service.session_list()
    if not sessions:
        sys.exit(
            "No sessions found. Create a session using the Model Health mobile app first."
        )

    print(f"\n{len(sessions)} session(s):\n")
    return pick_one(
        sessions,
        "Select session",
        lambda s: f"[session ID: {s.id}]  session name: {s.session_name or '(unnamed)'}  subject: {s.name or '(unnamed)'}",
    )


def _pick_activity(service, session):
    print(f"\nFetching activities for session ID: {session.id},  session name: {session.session_name or '(unnamed)'}, subject: {session.name or '(unnamed)'}...")
    all_activities = service.activity_list(session)
    activities = [
        a for a in all_activities
        if a.name not in _INTERNAL_ACTIVITY_NAMES
    ]
    if not activities:
        sys.exit("No activities found in this session.")

    print(f"\n{len(activities)} activity/activities:\n")
    return pick_one(
        activities,
        "Select activity",
        lambda a: f"{a.name or a.id}  [{a.status}]" + (f"  {a.activity_type}" if a.activity_type else ""),
    )


# ---------------------------------------------------------------------------
# Readiness
# ---------------------------------------------------------------------------

def _ensure_ready(service, activity):
    activity_label = activity.name or activity.id
    print(f"\nChecking status of '{activity_label}'...")
    status = service.activity_status(activity)

    if isinstance(status, ActivityStatusUploading) or status == ActivityStatus.processing:
        print("Waiting for processing to complete...")
        status = _poll_processing(service, activity)

    if status != ActivityStatus.ready:
        sys.exit(
            f"Activity cannot be analysed (status: {status}). "
            "Wait for uploads to finish and try again."
        )
    print("Activity is ready.")


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

def _start_analysis(service, activity, session):
    # Default to the activity's recorded type if available.
    default_analysis = next(
        (t for t in ANALYSIS_TYPES if t[0] == activity.activity_type),
        None,
    )
    print("\nAnalysis type:\n")
    analysis_value, analysis_label = pick_one(
        ANALYSIS_TYPES,
        "Select analysis type",
        lambda t: t[1],
        default=default_analysis,
    )

    print(f"\nStarting '{analysis_label}' analysis...")
    try:
        return service.start_analysis(analysis_value, activity, session)
    except ModelHealthError as exc:
        sys.exit(f"Failed to start analysis: {exc}")


def _wait_for_analysis(service, task, activity):
    print("Waiting for analysis to complete...")
    result_status = poll_analysis(service, task)

    if result_status != AnalysisStatus.completed:
        sys.exit(f"Analysis did not complete (status: {result_status}).")
    print("Analysis complete.")

    # Re-fetch the activity so its results field contains the analysis URLs.
    return service.fetch_activity(activity.id)


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

def _download_results(service, activity):
    print("\nWhich results would you like to save?\n")
    selected = pick_multi(
        RESULT_TYPES,
        "Select result types",
        lambda r: r[1],
    )
    data_types = [r[0] for r in selected]

    slug = (activity.name or activity.id).replace(" ", "_")

    print("\nDownloading...")
    results = service.analysis_data_for_activity(activity, data_types)
    for r in results:
        ext = ANALYSIS_DATA_EXT.get(r.type, "bin")
        path = save_file(f"{slug}_{r.type}.{ext}", r.data)
        print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    service = _connect(api_key)
    session = _pick_session(service)
    activity = _pick_activity(service, session)
    _ensure_ready(service, activity)

    task = _start_analysis(service, activity, session)
    activity = _wait_for_analysis(service, task, activity)
    _download_results(service, activity)

    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
