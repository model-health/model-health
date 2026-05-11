#!/usr/bin/env python3
"""Model Health Python SDK — external data demo.

Demonstrates attaching external files (e.g. sensor data CSVs, audio
recordings) to an existing activity and downloading them back by tag.

Commands:
  upload    Select a ready activity and attach one or more local files.
  download  Select an activity and download a previously attached file by tag.

Key constraint: when an activity will receive external data, it must
have been recorded *without* an activity type.  Passing an activity
type to start_recording causes the server to auto-trigger analysis as
soon as the videos finish processing, before you have a chance to
attach the external files.  Record with no activity type, wait for
'ready', upload, then call start_analysis yourself.

Usage:
    external_data.py upload   [<api_key>]
    external_data.py download [<api_key>]
"""

import os
import sys
import time

from docopt import docopt

from modelhealth import (
    ActivityStatus,
    ActivityStatusUploading,
    ExternalResultFile,
    ModelHealthError,
    ModelHealthService,
    MotionDataType,
)
from _prompts import pick_one
from _utils import load_api_key, save_file

# Activities created by the mobile app for internal use — exclude from lists.
_INTERNAL_ACTIVITY_NAMES = {"calibration", "neutral"}

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _connect(api_key):
    try:
        return ModelHealthService(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


def _pick_activity(service):
    print("\nFetching sessions...")
    try:
        sessions = service.session_list()
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
        all_activities = service.activity_list(session)
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch activities: {exc}")

    activities = [a for a in all_activities if a.name not in _INTERNAL_ACTIVITY_NAMES]
    if not activities:
        sys.exit("No activities found in this session.")

    print(f"\n{len(activities)} activity/activities:\n")
    return session, pick_one(
        activities,
        "Select activity",
        lambda a: f"{a.name or a.id}  [{a.status}]",
    )


def _poll_processing(service, activity, interval=5):
    while True:
        status = service.activity_status(activity)
        if isinstance(status, ActivityStatusUploading):
            print(
                f"  Uploading ({status.uploaded}/{status.total} cameras)...  ",
                end="\r", flush=True,
            )
        elif status == ActivityStatus.processing:
            print("  Processing...                              ", end="\r", flush=True)
        else:
            print()
            return status
        time.sleep(interval)


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

def _prompt_files():
    files = []
    print("\nEnter the files to attach (leave path blank to finish).")
    print("Tag:  a short identifier for the data source, e.g. 'acme-force-plate'.")
    print("      Audio files: enter tag 'audio'.")
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

        if tag == "audio":
            files.append(ExternalResultFile.audio(data))
            print(f"  Added: {os.path.basename(path)} (audio)")
        else:
            fmt = pick_one(
                [("csv", "CSV"), ("json", "JSON"), ("binary", "Binary")],
                "  Format",
                lambda f: f[1],
            )[0]
            files.append(ExternalResultFile.tagged(tag, fmt, data))
            print(f"  Added: {os.path.basename(path)} (tag={tag!r}, format={fmt})")

    return files


def cmd_upload(api_key):
    service = _connect(api_key)
    _session, activity = _pick_activity(service)

    print(f"\nChecking status of '{activity.name or activity.id}'...")
    try:
        status = service.activity_status(activity)
    except ModelHealthError as exc:
        sys.exit(f"Failed to check activity status: {exc}")

    if isinstance(status, ActivityStatusUploading) or status == ActivityStatus.processing:
        print("Activity is still uploading/processing. Waiting...")
        status = _poll_processing(service, activity)

    if status != ActivityStatus.ready:
        sys.exit(
            f"Activity is not ready for upload (status: {status}).\n"
            "Ensure the activity has finished uploading and processing."
        )

    print("Activity is ready.")

    files = _prompt_files()

    print(f"\nUploading {len(files)} file(s)...")
    try:
        activity = service.add_motion_data_to_activity(activity, files)
    except ModelHealthError as exc:
        sys.exit(f"Upload failed: {exc}")

    attached = [r for r in activity.results if r.tag not in (None, "")]
    print(f"Upload complete. Activity now has {len(attached)} result(s):")
    for r in attached:
        print(f"  [{r.id}]  tag={r.tag!r}")

    print("\nDone. Run activity_analysis.py to analyse this activity.")


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def cmd_download(api_key):
    service = _connect(api_key)
    _session, activity = _pick_activity(service)

    try:
        activity = service.fetch_activity(activity.id)
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch activity: {exc}")

    tagged_results = [r for r in activity.results if r.tag]
    if not tagged_results:
        sys.exit(
            "This activity has no tagged results.\n"
            "Use the 'upload' command to attach external files first."
        )

    print(f"\n{len(tagged_results)} tagged result(s):\n")
    result = pick_one(
        tagged_results,
        "Select result to download",
        lambda r: f"tag={r.tag!r}  id={r.id}",
    )

    tag = result.tag
    print(f"\nDownloading '{tag}'...")
    try:
        results = service.motion_data_for_activity(activity, [MotionDataType.tagged(tag)])
    except ModelHealthError as exc:
        sys.exit(f"Download failed: {exc}")

    if not results:
        sys.exit(f"No data found for tag '{tag}'.")
    data = results[0].data

    slug = (activity.name or activity.id).replace(" ", "_")
    path = save_file(f"{slug}_{tag}", data)
    print(f"Saved {len(data):,} bytes → {path}")
    print("\nDone.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    args = docopt(__doc__)
    api_key = load_api_key(args["<api_key>"])
    if args["upload"]:
        cmd_upload(api_key)
    else:
        cmd_download(api_key)
