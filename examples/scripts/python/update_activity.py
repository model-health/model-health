#!/usr/bin/env python3
"""Model Health Python SDK — update activity metadata demo.

Walks through updating an existing activity:
  1. Select a subject
  2. Select one of their activities (calibration and neutral recordings excluded)
  3. Optionally update the activity name and/or tags

Usage:
    update_activity.py [<api_key>]
"""

import sys

from docopt import docopt

from modelhealth import (
    ActivityConfig,
    ModelHealthError,
    ModelHealthClient,
)
from _prompts import confirm, pick_one
from _utils import load_api_key, attach_logging

def _load_activities(client, subject):
    """Every activity recorded for this subject, newest first.

    ``list(...)`` returns a sequence that fetches as it is read; ``all()`` collects
    it. Calibration and neutral-pose activities are left out by default, so there
    is nothing to filter here.
    """
    return client.activities.list(subject=subject, order_by="-created_at").all()


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

def _connect(api_key):
    print("Connecting...")
    try:
        client = ModelHealthClient(api_key)
        attach_logging(client)
        return client
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


# ---------------------------------------------------------------------------
# Subject / activity selection
# ---------------------------------------------------------------------------

def _pick_subject(client):
    print("\nFetching subjects...")
    try:
        subjects = client.subjects.list().all()
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch subjects: {exc}")

    if not subjects:
        sys.exit("No subjects found.")

    print()
    subject = pick_one(subjects, "Select subject", lambda s: f"{s.name}  (ID {s.id})")
    print(f"  Selected: {subject.name}")
    return subject


def _pick_activity(client, subject):
    print(f"\nFetching activities for {subject.name}...")
    try:
        activities = _load_activities(client, subject)
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch activities: {exc}")

    if not activities:
        sys.exit(f"No activities found for {subject.name}.")

    print()
    activity = pick_one(
        activities,
        "Select activity",
        lambda a: f"{a.name or a.id}  [{a.status}]"
        + (f"  {a.activity_type.display_name}" if a.activity_type else ""),
    )
    print(f"  Selected: {activity.name or activity.id}")
    return activity


# ---------------------------------------------------------------------------
# Edits
# ---------------------------------------------------------------------------

def _prompt_edits(activity):
    """Returns (new_name, add_tags, remove_tags) — all falsy if nothing changed."""
    print("\nUpdate activity (press Enter to keep current value):")
    print(f"  Current activity type: {activity.activity_type.display_name if activity.activity_type else '(none)'}")
    current_tags = ", ".join(activity.tags) if activity.tags else "(none)"
    print(f"  Current tags: {current_tags}")

    new_name = input(f"  Name [{activity.name or activity.id}]: ").strip() or None

    add_input = input("  Tags to add, comma-separated (press Enter to skip): ").strip()
    add_tags = [t.strip() for t in add_input.split(",") if t.strip()] if add_input else []

    remove_input = input("  Tags to remove, comma-separated (press Enter to skip): ").strip()
    remove_tags = [t.strip() for t in remove_input.split(",") if t.strip()] if remove_input else []

    return new_name, add_tags, remove_tags


def _apply_edits(client, activity, new_name, add_tags, remove_tags):
    print("\nUpdating activity...")
    try:
        activity = client.update_activity(
            activity,
            ActivityConfig(name=new_name, add_tags=add_tags, remove_tags=remove_tags),
        )
    except ModelHealthError as exc:
        sys.exit(f"Failed to update activity: {exc}")

    print(f"  Name:  {activity.name or activity.id}")
    updated_tags = ", ".join(activity.tags) if activity.tags else "(none)"
    print(f"  Tags:  {updated_tags}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    client = _connect(api_key)
    subject = _pick_subject(client)
    activity = _pick_activity(client, subject)

    new_name, add_tags, remove_tags = _prompt_edits(activity)
    if not new_name and not add_tags and not remove_tags:
        print("No changes — exiting.")
        return

    _apply_edits(client, activity, new_name, add_tags, remove_tags)
    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
