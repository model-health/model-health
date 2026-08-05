#!/usr/bin/env python3
"""Model Health Python SDK — external data upload demo.

Demonstrates attaching external files (e.g. sensor data CSVs)
to an existing activity.

Usage:
    add_external_data.py [<api_key>]
"""

import os
import sys

from docopt import docopt

from modelhealth import (
    ExternalResultFile,
    ModelHealthError,
    ModelHealthClient,
)
from _prompts import pick_one
from _utils import load_api_key

# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}


def _connect(api_key):
    try:
        return ModelHealthClient(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


def _pick_activity(client):
    print("\nFetching sessions...")
    try:
        sessions = client.session_list()
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch sessions: {exc}")

    if not sessions:
        sys.exit("No sessions found.")

    print(f"\n{len(sessions)} session(s):\n")
    session = pick_one(
        sessions,
        "Select session",
        lambda s: f"[{s.id}]  {s.session_name or '(unnamed)'}  —  subject: {s.name or '(unnamed)'}",
    )

    print(f"\nFetching activities for session {session.id}...")
    try:
        all_activities = client.activity_list(session)
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch activities: {exc}")

    activities = [a for a in all_activities if a.name not in _INTERNAL_ACTIVITY_NAMES]
    if not activities:
        sys.exit("No activities found in this session.")

    print(f"\n{len(activities)} activity/activities:\n")
    return pick_one(
        activities,
        "Select activity",
        lambda a: f"{a.name or a.id}  [{a.status}]",
    )


def _prompt_files():
    files = []
    print("\nEnter the files to attach (leave path blank to finish).")
    print("Tag:  a short identifier for the data source, e.g. 'my-force-plate'.")
    print()

    while True:
        path = input("  File path (or Enter to finish): ").strip()
        if not path:
            if not files:
                print("  At least one file is required.")
                continue
            break

        path = os.path.expanduser(path)
        if not os.path.isfile(path):
            print(f"  File not found: {path}")
            continue

        tag = input("  Tag for this file: ").strip()
        if not tag:
            print("  Tag must not be empty.")
            continue

        try:
            with open(path, "rb") as fh:
                data = fh.read()
        except OSError as exc:
            print(f"  Could not read file: {exc}")
            continue

        _, dot_ext = os.path.splitext(path)
        extension = dot_ext.lstrip(".") if dot_ext else input("  File extension (e.g. csv, bin): ").strip()
        if not extension:
            print("  Extension must not be empty.")
            continue

        files.append(ExternalResultFile(tag, extension, data))
        print(f"  Added: {os.path.basename(path)} (tag={tag!r}, extension={extension!r})")

    return files


if __name__ == "__main__":
    args = docopt(__doc__)
    api_key = load_api_key(args["<api_key>"])

    client = _connect(api_key)
    activity = _pick_activity(client)
    files = _prompt_files()

    print(f"\nUploading {len(files)} file(s)...")
    try:
        client.add_motion_data_to_activity(activity, files)
    except ModelHealthError as exc:
        sys.exit(f"Upload failed: {exc}")

    print("\nDone.")
