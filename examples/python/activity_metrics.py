#!/usr/bin/env python3
"""Model Health Python SDK — Retrieve biomechanical metrics for an activity or subject.

Demonstrates ``activity_metrics`` (single-activity dashboard metrics) and
``subject_metrics`` (all metrics across activities for a subject, with optional
date filtering).

Usage:
    activity_metrics.py [<api_key>]
"""

import sys
from datetime import date, timedelta

from docopt import docopt

from modelhealth import (
    ModelHealthService,
    ModelHealthError,
    MetricValueScalar,
    MetricValueBilateral,
)
from _prompts import pick_one, confirm
from _utils import load_api_key

# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}


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
        lambda s: f"[session ID: {s.id}]  session name: {s.session_name or '(unnamed)'}  subject: {s.name or '(unnamed)'}",
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
        lambda a: f"{a.name or a.id}  [{a.status}]",
    )

    # Activity metrics
    activity_label = activity.name or activity.id
    print(f"\nFetching metrics for '{activity_label}'...")
    try:
        metrics = service.activity_metrics(activity.id)
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch activity metrics: {exc}")

    if not metrics.groups:
        print("  No metrics available for this activity.")
    else:
        print(f"\nActivity metrics (activity type ID: {metrics.activity_type_id}):\n")
        for group in metrics.groups:
            print(f"  {group.name}")
            for metric in group.metrics:
                print(f"    {metric.name}: {_format_value(metric.value)}")

    # Subject metrics (optional)
    print("\n" + "-" * 40)
    if not confirm("\nFetch subject-level metrics?", default=False):
        print("\nDone.")
        return

    print("\nFetching subjects...")
    subjects = service.subject_list()
    if not subjects:
        sys.exit("No subjects found.")

    print(f"\n{len(subjects)} subject(s):\n")
    subject = pick_one(
        subjects,
        "Select subject",
        lambda s: f"[ID: {s.id}]  {s.name}",
    )

    start_str = None
    end_str = None
    if confirm("\nFilter by date range? (default: last 30 days)", default=False):
        today = date.today()
        start_str = (today - timedelta(days=30)).isoformat()
        end_str = today.isoformat()
        print(f"  Range: {start_str} to {end_str}")

    print(f"\nFetching metrics for subject '{subject.name}' (ID: {subject.id})...")
    try:
        all_metrics = service.subject_metrics(subject.id, start=start_str, end=end_str)
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch subject metrics: {exc}")

    if not all_metrics:
        print("  No metrics found for this subject.")
    else:
        print(f"\n  {len(all_metrics)} activity result(s):\n")
        for am in all_metrics:
            total = sum(len(g.metrics) for g in am.groups)
            print(
                f"  Activity {am.activity_id}"
                f"  (type ID: {am.activity_type_id})"
                f"  — {total} metric(s)"
            )

    print("\nDone.")


def _format_value(value):
    if isinstance(value, MetricValueScalar):
        return str(value.value) if value.value is not None else "—"
    if isinstance(value, MetricValueBilateral):
        left = str(value.left) if value.left is not None else "—"
        right = str(value.right) if value.right is not None else "—"
        return f"L {left}  R {right}"
    return repr(value)


if __name__ == "__main__":
    args = docopt(__doc__)
    try:
        main(load_api_key(args["<api_key>"]))
    except ModelHealthError as exc:
        print(f"Error: {exc}")
        sys.exit(1)
