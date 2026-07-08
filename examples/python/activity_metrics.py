#!/usr/bin/env python3
"""Model Health Python SDK — Retrieve biomechanical metrics for an activity.

Demonstrates ``activity_metrics`` (single-activity dashboard metrics).

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
from _utils import load_api_key, save_file

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

    flat = _flatten_metrics(metrics)
    if not flat:
        print("  No metrics available for this activity.")
    else:
        print("\nActivity metrics:\n")
        for name, value in flat.items():
            print(f"  {name}: {_format_value(value)}")

        if confirm("\nSave metrics as JSON?", default=False):
            slug = activity_label.replace(" ", "_")
            path = save_file(f"{slug}_metrics.json", metrics.to_json().encode("utf-8"))
            print(f"  Saved {path}")

    print("\nDone.")


def _flatten_metrics(metrics):
    """Collapse the grouped metrics into a flat name -> value mapping.

    Groups are discarded and each metric appears exactly once; the first
    occurrence of a name wins.
    """
    flat = {}
    for group in metrics.groups:
        for metric in group.metrics:
            if metric.name not in flat:
                flat[metric.name] = metric.value
    return flat


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
