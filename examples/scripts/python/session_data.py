#!/usr/bin/env python3
"""Model Health Python SDK — Download data from an existing session.

Walks through selecting a session and activity, then lets you choose which
data to download: videos, raw motion data and analysis results. Also
downloads the OpenSim model from the neutral activity if one is present.

Usage:
    session_data.py [<api_key>]
"""

import sys

from docopt import docopt

from modelhealth import (
    ModelHealthService,
    ModelHealthError,
    ActivityStatus,
    MotionDataType,
    AnalysisDataType,
    VideoVersion,
)
from _prompts import pick_one, pick_multi
from _utils import save_file, MOTION_DATA_EXT, ANALYSIS_DATA_EXT, load_api_key

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}

VIDEO_VERSIONS = [
    (VideoVersion.raw,    "Raw      (per-camera original recordings)"),
    (VideoVersion.synced, "Synced   (temporally-synchronised output) "),
]

MOTION_DATA_TYPES = [
    (MotionDataType.kinematics_mot, "Kinematics  (MOT)"),
    (MotionDataType.kinematics_csv, "Kinematics  (CSV)"),
    (MotionDataType.markers_trc,    "Markers     (TRC)"),
    (MotionDataType.markers_csv,    "Markers     (CSV)"),
]

ANALYSIS_DATA_TYPES = [
    (AnalysisDataType.report,  "Report   (PDF) "),
    (AnalysisDataType.data,    "Data     (ZIP) "),
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    print("Connecting to Model Health...")
    try:
        service = ModelHealthService(api_key=api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")

    # Session
    print("\nFetching sessions...")
    sessions = service.session_list()
    if not sessions:
        sys.exit(
            "No sessions found. Create a session using the Model Health mobile app first."
        )

    print(f"\n{len(sessions)} session(s):\n")
    session = pick_one(
        sessions,
        "Select session",
        lambda s: f"[session ID: {s.id}]  session name: {s.session_name or '(unnamed)'}  subject: {s.name or '(unnamed)'}  created: {s.created_at}",
    )

    # Activities
    print(f"\nFetching activities for session ID: {session.id}...")
    all_activities = service.activity_list(session)
    activities = [a for a in all_activities if a.name not in _INTERNAL_ACTIVITY_NAMES]
    if not activities:
        sys.exit("No activities found in this session.")

    print(f"\n{len(activities)} activity/activities:\n")
    activity = pick_one(
        activities,
        "Select activity",
        lambda a: f"{a.name or a.id}  [{a.status}]" + (f"  {a.activity_type}" if a.activity_type else "") + f"  updated: {a.updated_at}",
    )

    # Check status
    activity_label = activity.name or activity.id
    print(f"\nChecking status of '{activity_label}'...")
    status = service.activity_status(activity)
    if status != ActivityStatus.ready:
        sys.exit(
            f"Activity '{activity_label}' is not ready (status: {status}). "
            "Wait for processing to complete and try again."
        )
    print("Activity is ready.")

    slug = activity_label.replace(" ", "_")

    # Videos
    print("\nWhich video versions would you like to download?\n")
    selected_versions = pick_multi(
        VIDEO_VERSIONS,
        "Select video versions",
        lambda v: v[1],
    )

    print("\nDownloading videos...")
    for version_value, version_label in selected_versions:
        version_slug = "raw" if version_value == VideoVersion.raw else "synced"
        print(f"  {version_label.strip()}...")
        videos = service.videos_for_activity(activity, version_value)
        if not videos:
            print("  No videos available for this activity.")
        else:
            for i, video_data in enumerate(videos):
                path = save_file(f"{slug}_video_{version_slug}_{i}.mp4", video_data)
                print(f"  Saved: {path}")

    # Motion data
    print("\nWhich motion data would you like to download?\n")
    selected_motion = pick_multi(
        MOTION_DATA_TYPES,
        "Select motion data types",
        lambda t: t[1],
    )
    motion_types = [t[0] for t in selected_motion]

    print("\nDownloading motion data...")
    results = service.motion_data_for_activity(activity, motion_types)
    if not results:
        print("  No motion data available.")
    else:
        for r in results:
            ext = MOTION_DATA_EXT.get(r.type, "bin")
            path = save_file(f"{slug}_{r.type}.{ext}", r.data)
            print(f"  Saved: {path}")

    # Analysis data
    print("\nWhich analysis results would you like to download?\n")
    selected_analysis = pick_multi(
        ANALYSIS_DATA_TYPES,
        "Select analysis data types",
        lambda t: t[1],
    )
    analysis_types = [t[0] for t in selected_analysis]

    print("\nDownloading analysis data...")
    results = service.analysis_data_for_activity(activity, analysis_types)
    if not results:
        print("  No analysis data available.")
    else:
        for r in results:
            ext = ANALYSIS_DATA_EXT.get(r.type, "bin")
            path = save_file(f"{slug}_{r.type}.{ext}", r.data)
            print(f"  Saved: {path}")

    # OpenSim model from neutral activity
    neutral_activities = [a for a in all_activities if a.name == "neutral"]
    if neutral_activities:
        neutral = neutral_activities[-1]
        print(f"\nDownloading OpenSim model for neutral activity (id: {neutral.id})...")
        status = service.activity_status(neutral)
        if status != ActivityStatus.ready:
            print(f"  Skipping: neutral activity status is '{status}' (expected 'ready').")
        else:
            results = service.motion_data_for_activity(neutral, [MotionDataType.model])
            for r in results:
                ext = MOTION_DATA_EXT.get(r.type, "bin")
                path = save_file(f"neutral_{r.type}.{ext}", r.data)
                print(f"  Saved: {path}")

    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    try:
        main(load_api_key(args["<api_key>"]))
    except ModelHealthError as exc:
        print(f"Error: {exc}")
        sys.exit(1)
