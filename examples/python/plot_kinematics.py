#!/usr/bin/env python3
"""Model Health Python SDK — Download and plot kinematics for an activity.

Walks through selecting a session (your own or a public demo session),
picking an activity, downloading its kinematics CSV and plotting selected
joint angle columns against time.

Usage:
    plot_kinematics.py [<api_key>]
"""

import io
import sys

import pandas as pd
import matplotlib.pyplot as plt
from docopt import docopt

from modelhealth import (
    ModelHealthService,
    ModelHealthError,
    ActivityStatus,
    MotionDataType,
)
from _prompts import confirm, pick_one, pick_multi
from _utils import save_file, MOTION_DATA_EXT, load_api_key

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEMO_SESSION_ID = "63f3faaf-712d-4cef-845e-e2eb904ca5b4"

# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    # Ask whether to use own data or the demo session
    use_demo = confirm("Load data from the public demo session?", default=False)

    print("\nConnecting...")
    try:
        service = ModelHealthService(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")

    # Load session
    if use_demo:
        print(f"\nFetching demo session '{DEMO_SESSION_ID}'...")
        try:
            session = service.get_session(DEMO_SESSION_ID)
        except ModelHealthError as exc:
            sys.exit(f"Failed to fetch demo session: {exc}")
    else:
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
            lambda s: f"[session ID: {s.id}]  session name: {s.session_name or '(unnamed)'}  subject: {s.name or '(unnamed)'}",
        )

    # Load activities
    session_label = session.session_name or session.name or session.id
    print(f"\nFetching activities for session '{session_label}'...")
    all_activities = service.activity_list(session)
    activities = [a for a in all_activities if a.name not in _INTERNAL_ACTIVITY_NAMES]
    if not activities:
        sys.exit("No activities found in this session.")

    print(f"\n{len(activities)} activity/activities:\n")
    activity = pick_one(
        activities,
        "Select activity",
        lambda a: f"{a.name or a.id}  [{a.status}]",
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

    # Download kinematics CSV
    print("\nDownloading kinematics CSV...")
    results = service.motion_data_for_activity(activity, [MotionDataType.kinematics_csv])
    if not results:
        sys.exit("No kinematics CSV data returned for this activity.")

    csv_data = results[0].data
    ext = MOTION_DATA_EXT.get(results[0].type, "csv")
    slug = activity_label.replace(" ", "_")
    csv_path = save_file(f"{slug}_kinematics.{ext}", csv_data)
    print(f"  Saved: {csv_path}")

    # Load CSV
    df = pd.read_csv(io.BytesIO(csv_data), comment="#")

    # Identify the time column (first column) and data columns (rest)
    time_col = df.columns[0]
    data_cols = list(df.columns[1:])

    if not data_cols:
        sys.exit("CSV contains no data columns to plot.")

    # Let the user pick which columns to plot
    print(f"\n{len(data_cols)} column(s) available:\n")
    selected_cols = pick_multi(
        data_cols,
        "Select columns to plot",
        lambda c: c,
    )

    # Plot
    fig, ax = plt.subplots(figsize=(12, 5))
    for col in selected_cols:
        ax.plot(df[time_col], df[col], label=col)

    ax.set_xlabel(time_col)
    ax.set_ylabel("Value")
    ax.set_title(f"Kinematics — {activity_label}")
    ax.legend()
    fig.tight_layout()

    plot_path = save_file(f"{slug}_kinematics.png", b"")  # reserve filename
    fig.savefig(plot_path)
    plt.close(fig)
    print(f"\nPlot saved: {plot_path}")

    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
