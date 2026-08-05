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
    ActivitySort,
    ModelHealthError,
    ModelHealthClient,
)
from _prompts import confirm, pick_one
from _utils import load_api_key

# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}

_PAGE_SIZE = 50


def _load_activities(client, subject):
    """Fetch all non-internal activities for a subject."""
    activities = []
    offset = 0
    while True:
        page = client.activities_for_subject(
            subject, start_index=offset, count=_PAGE_SIZE, sort=ActivitySort.updated_at
        )
        for a in page:
            if (a.name or "").lower() not in _INTERNAL_ACTIVITY_NAMES:
                activities.append(a)
        if len(page) < _PAGE_SIZE:
            break
        offset += _PAGE_SIZE
    return activities


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

def _connect(api_key):
    print("Connecting...")
    try:
        return ModelHealthClient(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


# ---------------------------------------------------------------------------
# Subject / activity selection
# ---------------------------------------------------------------------------

def _pick_subject(client):
    print("\nFetching subjects...")
    try:
        subjects = client.subject_list()
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
        lambda a: f"{a.name or a.id}  [{a.status}]" + (f"  {a.activity_type}" if a.activity_type else ""),
    )
    print(f"  Selected: {activity.name or activity.id}")
    return activity


# ---------------------------------------------------------------------------
# Edits
# ---------------------------------------------------------------------------

def _prompt_edits(activity):
    """Returns (new_name, add_tags, remove_tags) — all falsy if nothing changed."""
    print("\nUpdate activity (press Enter to keep current value):")
    print(f"  Current activity type: {activity.activity_type or '(none)'}")
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
