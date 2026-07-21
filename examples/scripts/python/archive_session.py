#!/usr/bin/env python3
"""Model Health Python SDK — session archive demo.

Walks through the archive workflow:
  1. Select a session
  2. Choose whether to include raw video files
  3. Request archive preparation
  4. Poll until the archive is ready (or fails)
  5. Download and save the ZIP file

Usage:
    archive_session.py [<api_key>]
"""

import sys
import time

from docopt import docopt

from modelhealth import (
    ModelHealthService,
    ModelHealthError,
    ArchiveStatus,
)
from _prompts import pick_one, confirm
from _utils import save_file, load_api_key

# ---------------------------------------------------------------------------
# Polling helper
# ---------------------------------------------------------------------------

def _poll_archive(service, archive, interval=2):
    """Block until the archive is ready or has failed.

    Returns the final status (ArchiveStatus.ready or ArchiveStatus.failed).
    """
    while True:
        status = service.archive_status(archive)
        if status == ArchiveStatus.processing:
            print("  Preparing archive...  ", end="\r", flush=True)
        else:
            print()  # clear the \r line
            return status
        time.sleep(interval)


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

def _connect(api_key):
    print("Connecting...")
    try:
        return ModelHealthService(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


# ---------------------------------------------------------------------------
# Session selection
# ---------------------------------------------------------------------------

def _pick_session(service):
    print("\nFetching sessions...")
    sessions = service.session_list()
    if not sessions:
        sys.exit(
            "No sessions found. Create a session using the Model Health mobile app first."
        )

    print(f"\n{len(sessions)} session(s):\n")
    return pick_one(
        sessions,
        "Select session to archive",
        lambda s: f"[session ID: {s.id}]  session name: {s.session_name or '(unnamed)'}  subject: {s.name or '(unnamed)'}  {s.activities_count} {'activity' if s.activities_count == 1 else 'activities'}",
    )


# ---------------------------------------------------------------------------
# Archive preparation
# ---------------------------------------------------------------------------

def _prepare_archive(service, session, with_videos):
    print(f"\nRequesting archive for session '{session.id}'...")
    try:
        archive = service.prepare_archive(session, with_videos=with_videos)
    except ModelHealthError as exc:
        sys.exit(f"Failed to start archive preparation: {exc}")

    print("Waiting for archive to be ready...")
    status = _poll_archive(service, archive)

    if status != ArchiveStatus.ready:
        sys.exit(f"Archive preparation did not complete (status: {status}).")
    print("Archive is ready.")

    return archive


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def _download_archive(service, archive, session):
    print("\nDownloading...")
    try:
        data = service.archive_data(archive)
    except ModelHealthError as exc:
        sys.exit(f"Failed to download archive: {exc}")

    path = save_file(f"ModelHealth_Session_{session.id}.zip", data)
    print(f"  Saved {path}  ({len(data):,} bytes)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    service = _connect(api_key)
    session = _pick_session(service)

    print()
    with_videos = confirm("Include raw video files in the archive?", default=False)

    archive = _prepare_archive(service, session, with_videos)
    _download_archive(service, archive, session)
    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
