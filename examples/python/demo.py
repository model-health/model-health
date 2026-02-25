#!/usr/bin/env python3
"""Model Health Python SDK — interactive CLI demo.

Walks through the post-capture workflow:
  1. Select a session
  2. Select an activity from that session
  3. Wait for processing to complete (if needed)
  4. Choose an analysis type and run it
  5. Choose which result files to save (metrics JSON, report PDF, data ZIP)

Usage:
    python3 demo.py <api_key>
"""

import os
import sys
import time

from modelhealth import ModelHealthService

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ANALYSIS_TYPES = [
    ("counter_movement_jump", "Counter Movement Jump"),
    ("gait", "Overground Walking"),
    ("treadmill_gait", "Treadmill Walking"),
    ("treadmill_running", "Treadmill Running"),
    ("overground_running", "Overground Running"),
    ("sit_to_stand", "Sit-to-Stand Transfer"),
    ("squats", "Squats"),
    ("range_of_motion", "Range of Motion"),
    ("drop_jump", "Drop Vertical Jump"),
    ("hop", "Hop Test"),
    ("change_of_direction", "5-0-5 Test"),
    ("cut", "Cutting Manoeuvre"),
]

RESULT_TYPES = [
    ("metrics", "Metrics  (JSON)"),
    ("report",  "Report   (PDF) "),
    ("data",    "Data     (ZIP) "),
]

EXTENSIONS = {
    "metrics": "json",
    "report": "pdf",
    "data": "zip",
}

# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}

# ---------------------------------------------------------------------------
# Prompt helpers
# ---------------------------------------------------------------------------

def _pick_one(items, prompt, label_fn):
    """Display a numbered list and return the item the user selects."""
    for i, item in enumerate(items, 1):
        print(f"  {i}. {label_fn(item)}")
    while True:
        raw = input(f"{prompt} [1-{len(items)}]: ").strip()
        try:
            idx = int(raw) - 1
            if 0 <= idx < len(items):
                return items[idx]
        except ValueError:
            pass
        print(f"  Please enter a number between 1 and {len(items)}.")


def _pick_multi(items, prompt, label_fn):
    """Display a numbered list and return the items the user selects (one or more)."""
    for i, item in enumerate(items, 1):
        print(f"  {i}. {label_fn(item)}")
    while True:
        raw = input(f"{prompt} (e.g. 1 2 3): ").strip()
        try:
            indices = [int(x) - 1 for x in raw.split()]
            selected = [items[i] for i in indices if 0 <= i < len(items)]
            if selected:
                return selected
        except (ValueError, IndexError):
            pass
        print(f"  Please enter one or more numbers between 1 and {len(items)}.")


# ---------------------------------------------------------------------------
# Polling helpers
# ---------------------------------------------------------------------------

def _poll_processing(service, activity, interval=10):
    """Block until the activity finishes uploading and processing.

    Returns the final status dict (type == "ready" or "failed").
    """
    while True:
        status = service.get_status(activity)
        t = status.get("type", "")
        if t == "uploading":
            uploaded = status.get("uploaded", "?")
            total = status.get("total", "?")
            print(f"  Uploading ({uploaded}/{total} cameras)...  ", end="\r", flush=True)
        elif t == "processing":
            print("  Processing...                              ", end="\r", flush=True)
        else:
            print()  # clear the \r line
            return status
        time.sleep(interval)


def _poll_analysis(service, task, interval=10):
    """Block until the analysis task finishes.

    Returns the final status dict (type == "completed" or "failed").
    """
    while True:
        status = service.get_analysis_status(task)
        if status.get("type") == "processing":
            print("  Analysing...  ", end="\r", flush=True)
        else:
            print()  # clear the \r line
            return status
        time.sleep(interval)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # --- API key -----------------------------------------------------------
    if len(sys.argv) != 2:
        sys.exit(f"Usage: python3 {sys.argv[0]} <api_key>")
    api_key = sys.argv[1]

    print("Connecting...")
    try:
        service = ModelHealthService(api_key)
    except RuntimeError as exc:
        sys.exit(f"Failed to initialise: {exc}")

    # --- Session -----------------------------------------------------------
    print("\nFetching sessions...")
    sessions = service.session_list()
    if not sessions:
        sys.exit(
            "No sessions found. Create a session using the Model Health mobile app first."
        )

    print(f"\n{len(sessions)} session(s):\n")
    session = _pick_one(
        sessions,
        "Select session",
        lambda s: s.get("name") or s.get("session_name") or s["id"],
    )

    # --- Activity ----------------------------------------------------------
    session_label = session.get("name") or session["id"]
    print(f"\nFetching activities for '{session_label}'...")
    all_trials = service.trial_list(session["id"])
    activities = [
        t for t in all_trials
        if t.get("name") not in _INTERNAL_ACTIVITY_NAMES
    ]
    if not activities:
        sys.exit("No activities found in this session.")

    print(f"\n{len(activities)} activity/activities:\n")
    activity = _pick_one(
        activities,
        "Select activity",
        lambda a: f"{a.get('name') or a['id']}  [{a.get('status', '?')}]",
    )

    # --- Processing status -------------------------------------------------
    activity_label = activity.get("name") or activity["id"]
    print(f"\nChecking status of '{activity_label}'...")
    status = service.get_status(activity)

    if status["type"] in ("uploading", "processing"):
        print("Waiting for processing to complete...")
        status = _poll_processing(service, activity)

    if status["type"] != "ready":
        sys.exit(
            f"Activity cannot be analysed (status: {status['type']}). "
            "Wait for uploads to finish and try again."
        )
    print("Activity is ready.")

    # --- Analysis type -----------------------------------------------------
    print("\nAnalysis type:\n")
    analysis_value, analysis_label = _pick_one(
        ANALYSIS_TYPES,
        "Select analysis type",
        lambda t: t[1],
    )

    # --- Run analysis ------------------------------------------------------
    print(f"\nStarting '{analysis_label}' analysis...")
    try:
        task = service.start_analysis(analysis_value, activity, session)
    except RuntimeError as exc:
        sys.exit(f"Failed to start analysis: {exc}")

    print("Waiting for analysis to complete...")
    result_status = _poll_analysis(service, task)

    if result_status.get("type") != "completed":
        sys.exit(f"Analysis did not complete (status: {result_status.get('type')}).")
    print("Analysis complete.")

    # Re-fetch the activity so its results field contains the analysis URLs.
    activity = service.get_activity(activity["id"])

    # --- Choose result files to save --------------------------------------
    print("\nWhich results would you like to save?\n")
    selected = _pick_multi(
        RESULT_TYPES,
        "Select result types",
        lambda r: r[1],
    )
    data_types = [r[0] for r in selected]

    # --- Download and save ------------------------------------------------
    print("\nDownloading...")
    results = service.download_trial_analysis_result_data(activity, data_types)

    out_dir = os.path.join(os.path.dirname(__file__), "downloads")
    os.makedirs(out_dir, exist_ok=True)
    slug = (activity.get("name") or activity["id"]).replace(" ", "_")
    for result in results:
        dtype = result["result_data_type"]
        ext = EXTENSIONS.get(dtype, "bin")
        filename = os.path.join(out_dir, f"{slug}_{dtype}.{ext}")
        with open(filename, "wb") as f:
            f.write(result["data"])
        print(f"  Saved {filename}")

    print("\nDone.")


if __name__ == "__main__":
    main()
