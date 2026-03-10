#!/usr/bin/env python3
"""Example 1 — Download data from existing session.

Scenario
--------
You collected data using the Model Health app and want to download data
at different levels of granularity: the full session archive, per-activity
archives, OpenSim model, raw motion data, and analysis results.

What this example does
----------------------
1. Connect to the Model Health service.
2. Download the complete session archive.
3. Download a combined archive for specific activities (squat, cmj).
4. Download OpenSim model for neutral activity.
5. Download raw motion data for each activity (kinematic and marker data).
6. Download analysis data for each activity.
"""

from modelhealth import ModelHealthService, ModelHealthError, ActivityStatus, AnalysisStatus

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_KEY = "your-api-key-here"

SESSION_ID = "your-session-id-here"

# Names of the activities to download.
ACTIVITY_NAMES = ["squat", "cmj"]

# Set to True to include video files in the session per-activity archive.
WITH_VIDEOS = False

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # --- Connect -----------------------------------------------------------
    print("Connecting to Model Health...")
    service = ModelHealthService(api_key=API_KEY)

    # --- Download the whole session archive --------------------------------
    # Downloads everything in the session as a single archive file.
    # TODO - Warren: placeholder for session archive download example
    print(f"\nDownloading session archive for '{SESSION_ID}'...")
    download_session_archive = service.download_session_archive(SESSION_ID, with_videos=WITH_VIDEOS)
    download_session_archive.download()
    print(f"  Saved: {download_session_archive.filename}")

    # --- Resolve activity names to objects ---------------------------------
    # TODO - Warren: placeholder for accesssing activities by name
    print(f"\nFetching activities for session '{SESSION_ID}'...")
    session_activities = service.activity_list(SESSION_ID)

    user_activities = {
        a.name: a
        for a in session_activities
    }

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
    
    # Get neutral activity.
    neutral_activities = [a for a in session_activities if a.name == "NEUTRAL"]
    if neutral_activities:
        neutral_activity = sorted(neutral_activities, key=lambda a: a.created_at)[-1]
        print(f"  Found neutral activity: '{neutral_activity.name}' (id: {neutral_activity.id})")

    # --- Download a combined archive for all activities --------------------
    # Downloads all files for the selected activities in one archive.
    # TODO - Warren: placeholder for activities archive download example
    # We need to wait for API code to be merged before we can implement this example, as it depends on the new "download for multiple activities" endpoint.
    print("\nDownloading activities archive...")
    download_activities_archive = service.download_activities_archive(activities, with_videos=WITH_VIDEOS)
    download_activities_archive.download()
    print(f"  Saved: {download_activities_archive.filename}")

    # --- Download motion data for each activity ----------------------------
    # TODO - Warren: placeholder for motion data download example
    print("\nDownloading motion data...")
    for activity in activities:
        status = service.activity_status(activity)
        if status != ActivityStatus.ready:
            print(f"  Skipping '{activity.name}': status is '{status}' (expected 'ready').")
            continue
        motion_data_for_activity = service.motion_data_for_activity(activity, ['kinematics(.mot)', 'kinematics(.csv)', 'markers(.trc)', 'markers(.csv)'])
        motion_data_for_activity.download()
        print(f"  Saved: {motion_data_for_activity.filename}  [{activity.name}]")

    # --- Download OpenSim model for neutral activity ----------------------------
    # TODO - Warren: placeholder for OpenSim model download example    
    if neutral_activities:
        status = service.activity_status(neutral_activity)
        if status != ActivityStatus.ready:
            print(f"\nSkipping OpenSim model: neutral activity status is '{status}' (expected 'ready').")
        else:
            print("\nDownloading OpenSim model for neutral activity...")
            opensim_model_for_neutral_activity = service.opensim_model_for_activity(neutral_activity, ['opensim(.osim)'])
            opensim_model_for_neutral_activity.download()
            print(f"  Saved: {opensim_model_for_neutral_activity.filename}  [{neutral_activity.name}]")

    # --- Download analysis data for each activity -------------------------
    # TODO - Warren: placeholder for analysis data download example
    print("\nDownloading analysis data...")
    for activity in activities:
        status = service.activity_status(activity)
        if status != AnalysisStatus.ready:
            print(f"  Skipping '{activity.name}': status is '{status}' (expected 'ready').")
            continue
        analysis_data_for_activity = service.analysis_data_for_activity(activity, ["metrics", "report", "data"])
        analysis_data_for_activity.download()
        print(f"  Saved: {analysis_data_for_activity.filename}  [{activity.name}]")

    print("\nDone.")


if __name__ == "__main__":
    try:
        main()
    except ModelHealthError as e:
        print(f"Error: {e}")
