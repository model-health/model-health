#!/usr/bin/env python3
"""Model Health Python SDK — browse activities.

Walks through what an activity list can be asked for:
  1. Every activity: how many match, and what the first few look like
  2. How many match each filter, without reading any of them
  3. Which activity comes first under each order
  4. The activities of several subjects and types, in one request

Usage:
    list_activities.py [<api_key>]
"""

import sys
from datetime import date

from docopt import docopt

from modelhealth import ModelHealthError, ModelHealthClient
from _utils import load_api_key


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

def _connect(api_key):
    print("Connecting...")
    try:
        return ModelHealthClient(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


def _first_few(stream, count):
    """Reads at most `count` activities, then lets the rest go."""
    taken = []
    for activity in stream:
        taken.append(activity)
        if len(taken) == count:
            break
    return taken


def _describe(activity):
    kind = activity.activity_type.display_name if activity.activity_type else "(no type)"
    return (
        f"{activity.name or activity.id}  [{kind}]  "
        f"{activity.status}  {activity.created_at.date()}"
    )


# ---------------------------------------------------------------------------
# What a list can be asked
# ---------------------------------------------------------------------------

def _show_everything(client):
    print("\nEvery activity")
    stream = client.activities.list()
    print(f"  {stream.total} match")
    for activity in _first_few(stream, 5):
        print(f"    {_describe(activity)}")


def _show_filters(client):
    print("\nHow many match each filter")
    counts = [
        ("only completed", client.activities.list(only_completed=True)),
        ('named "squat"', client.activities.list(search="squat")),
        ("recorded in 2025", client.activities.list(
            created_after=date(2025, 1, 1), created_before=date(2025, 12, 31)
        )),
        ("calibration included", client.activities.list(exclude_calibration=False)),
    ]
    for label, stream in counts:
        print(f"  {label:<24} {stream.total}")


def _show_order(client):
    print("\nFirst activity under each order")
    for order_by in ("created_at", "-created_at", "status"):
        first = _first_few(client.activities.list(order_by=order_by), 1)
        print(f"  {order_by:<14} {_describe(first[0]) if first else '(nothing matched)'}")


def _show_several(client):
    print("\nSeveral subjects and types in one request")
    # Both are drawn from real, recent activities, so the filter is sure to match something.
    recent = [
        a for a in _first_few(client.activities.list(order_by="-created_at"), 50)
        if a.subject_info and a.activity_type
    ]
    subjects = list({a.subject_info.id: a.subject_info for a in recent}.values())[:2]
    types = list({a.activity_type.name: a.activity_type for a in recent}.values())[:2]
    if len(subjects) < 2:
        print("  (needs recent activities of at least two subjects)")
        return
    stream = client.activities.list(subjects=[s.id for s in subjects], activity_types=types)
    print(f"  {stream.total} match, across {', '.join(s.name for s in subjects)}")
    for activity in _first_few(stream, 5):
        who = activity.subject_info.name if activity.subject_info else "(no subject)"
        print(f"    {who}: {_describe(activity)}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    args = docopt(__doc__)
    client = _connect(load_api_key(args["<api_key>"]))

    try:
        _show_everything(client)
        _show_filters(client)
        _show_order(client)
        _show_several(client)
    except ModelHealthError as exc:
        sys.exit(f"Failed to list activities: {exc}")


if __name__ == "__main__":
    main()
