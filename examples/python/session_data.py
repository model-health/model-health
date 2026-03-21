#!/usr/bin/env python3
"""Model Health Python SDK — Download data from existing session.

Usage:
    session_data.py [<api_key>] <session_id>

Scenario
--------
You collected data using the Model Health app and want to download data
at different levels of granularity: the full session archive, raw motion
data and analysis results.

What this example does
----------------------
1. Connect to the Model Health service.
2. Download the complete session archive.
3. Download raw motion data for specific activities (squat, cmj).
4. Download OpenSim model for the neutral activity.
5. Download analysis data for each activity.
"""

import sys
import time

from docopt import docopt

from modelhealth import (
    ModelHealthService,
    ModelHealthError,
    ActivityStatus,
    ArchiveStatus,
    MotionDataType,
    AnalysisDataType,
)
from _utils import save_file, MOTION_DATA_EXT, ANALYSIS_DATA_EXT, load_api_key

# Names of the activities to download.
ACTIVITY_NAMES = ["squat", "cmj"]

# Set to True to include video files in the session archive.
WITH_VIDEOS = False

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _poll_archive(service, archive, interval=2):
    while True:
        status = service.archive_status(archive)
        if status == ArchiveStatus.processing:
            print("  Preparing archive...", end="\r", flush=True)
        else:
            print()
            return status
        time.sleep(interval)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key, session_id):
    # Connect
    print("Connecting to Model Health...")
    service = ModelHealthService(api_key=api_key)

    # Fetch session
    print(f"\nFetching session '{session_id}'...")
    session = service.get_session(session_id)
    session_label = (session.name or session.session_name or session.id).replace(" ", "_")

    # Download the whole session archive
    print(f"\nRequesting session archive...")
    archive = service.prepare_archive(session, with_videos=WITH_VIDEOS)
    status = _poll_archive(service, archive)
    if status != ArchiveStatus.ready:
        print(f"  Archive preparation did not complete (status: {status}) — skipping.")
    else:
        data = service.archive_data(archive)
        path = save_file(f"{session_label}.zip", data)
        print(f"  Saved: {path}  ({len(data):,} bytes)")

    # Resolve activity names to objects
    print(f"\nFetching activities for session '{session_id}'...")
    session_activities = service.activity_list(session)

    user_activities = {a.name: a for a in session_activities}

    activities = []
    for name in ACTIVITY_NAMES:
        if name not in user_activities:
            print(f"  Warning: activity '{name}' not found in session — skipping.")
            continue
        activities.append(user_activities[name])
        print(f"  Found: '{name}' (id: {user_activities[name].id})")

    if not activities:
        print("No matching activities found. Check your session ID and activity names.")
        return

    # Download motion data for each activity
    print("\nDownloading motion data...")
    for activity in activities:
        status = service.activity_status(activity)
        if status != ActivityStatus.ready:
            print(f"  Skipping '{activity.name}': status is '{status}' (expected 'ready').")
            continue
        results = service.motion_data_for_activity(
            activity,
            [MotionDataType.kinematics_mot, MotionDataType.kinematics_csv,
             MotionDataType.markers_trc, MotionDataType.markers_csv],
        )
        for r in results:
            ext = MOTION_DATA_EXT.get(r.type, "bin")
            path = save_file(f"{activity.name}_{r.type}.{ext}", r.data)
            print(f"  Saved: {path}")

    # Download OpenSim model for neutral activity
    neutral_activities = [a for a in session_activities if a.name == "neutral"]
    if neutral_activities:
        neutral_activity = neutral_activities[-1]
        print(f"\nDownloading OpenSim model for neutral activity (id: {neutral_activity.id})...")
        status = service.activity_status(neutral_activity)
        if status != ActivityStatus.ready:
            print(f"  Skipping: neutral activity status is '{status}' (expected 'ready').")
        else:
            results = service.motion_data_for_activity(neutral_activity, [MotionDataType.model])
            for r in results:
                ext = MOTION_DATA_EXT.get(r.type, "bin")
                path = save_file(f"neutral_{r.type}.{ext}", r.data)
                print(f"  Saved: {path}")

    # Download analysis data for each activity
    print("\nDownloading analysis data...")
    for activity in activities:
        status = service.activity_status(activity)
        if status != ActivityStatus.ready:
            print(f"  Skipping '{activity.name}': status is '{status}' (expected 'ready').")
            continue
        results = service.analysis_data_for_activity(
            activity,
            [AnalysisDataType.metrics, AnalysisDataType.report, AnalysisDataType.data],
        )
        for r in results:
            ext = ANALYSIS_DATA_EXT.get(r.type, "bin")
            path = save_file(f"{activity.name}_{r.type}.{ext}", r.data)
            print(f"  Saved: {path}")

    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    try:
        main(load_api_key(args["<api_key>"]), args["<session_id>"])
    except ModelHealthError as e:
        print(f"Error: {e}")
        sys.exit(1)
