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
    ModelHealthService,
)
from _prompts import confirm, pick_one
from _utils import load_api_key

# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}

_PAGE_SIZE = 50


def _load_activities(service, subject):
    """Fetch all non-internal activities for a subject."""
    activities = []
    offset = 0
    while True:
        page = service.activities_for_subject(
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
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    print("Connecting...")
    try:
        service = ModelHealthService(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")

    # Subject
    print("\nFetching subjects...")
    try:
        subjects = service.subject_list()
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch subjects: {exc}")

    if not subjects:
        sys.exit("No subjects found.")

    print()
    subject = pick_one(subjects, "Select subject", lambda s: f"{s.name}  (ID {s.id})")
    print(f"  Selected: {subject.name}")

    # Activities
    print(f"\nFetching activities for {subject.name}...")
    try:
        activities = _load_activities(service, subject)
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch activities: {exc}")

    if not activities:
        sys.exit(f"No activities found for {subject.name}.")

    print()
    activity = pick_one(
        activities,
        "Select activity",
        lambda a: f"{a.name or a.id}  [{a.status}]",
    )
    print(f"  Selected: {activity.name or activity.id}")

    # Update
    print("\nUpdate activity (press Enter to keep current value):")

    new_name = input(f"  Name [{activity.name or activity.id}]: ").strip() or None

    tags_input = input("  Tags, comma-separated (leave blank to skip): ").strip()
    new_tags = [t.strip() for t in tags_input.split(",") if t.strip()] if tags_input else []

    if not new_name and not new_tags:
        print("No changes — exiting.")
        return

    print("\nUpdating activity...")
    try:
        activity = service.update_activity(
            activity,
            ActivityConfig(name=new_name, tags=new_tags),
        )
    except ModelHealthError as exc:
        sys.exit(f"Failed to update activity: {exc}")

    print(f"  Name:  {activity.name or activity.id}")
    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
