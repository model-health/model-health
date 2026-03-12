#!/usr/bin/env python3
"""Model Health Python SDK — session archive demo.

Walks through the archive workflow:
  1. Select a session
  2. Choose whether to include raw video files
  3. Request archive preparation
  4. Poll until the archive is ready (or fails)
  5. Download and save the ZIP file

Usage:
    python3 archive_demo.py <api_key>
"""

import os
import sys
import time

from modelhealth import (
    ModelHealthService,
    ModelHealthError,
    ArchiveStatus,
)
from _prompts import pick_one, confirm

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
# Main
# ---------------------------------------------------------------------------

def main():
    # --- API key -----------------------------------------------------------
    if len(sys.argv) != 2:
        sys.exit(f"Usage: python3 {sys.argv[0]} <api_key>")
    api_key = sys.argv[1]

    print("Connecting...")
    try:
        service = ModelHealthService(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")

    # --- Session -----------------------------------------------------------
    print("\nFetching sessions...")
    sessions = service.session_list()
    if not sessions:
        sys.exit(
            "No sessions found. Create a session using the Model Health mobile app first."
        )

    print(f"\n{len(sessions)} session(s):\n")
    session = pick_one(
        sessions,
        "Select session to archive",
        lambda s: f"{s.name or s.session_name or s.id}  ({s.activities_count} {'activity' if s.activities_count == 1 else 'activities'})",
    )

    # --- Options -----------------------------------------------------------
    print()
    with_videos = confirm("Include raw video files in the archive?", default=False)

    # --- Request archive ---------------------------------------------------
    session_label = session.name or session.id
    print(f"\nRequesting archive for '{session_label}'...")
    try:
        archive = service.prepare_archive(session, with_videos=with_videos)
    except ModelHealthError as exc:
        sys.exit(f"Failed to start archive preparation: {exc}")

    # --- Poll for completion -----------------------------------------------
    print("Waiting for archive to be ready...")
    status = _poll_archive(service, archive)

    if status != ArchiveStatus.ready:
        sys.exit(f"Archive preparation did not complete (status: {status}).")
    print("Archive is ready.")

    # --- Download and save -------------------------------------------------
    print("\nDownloading...")
    try:
        data = service.archive_data(archive)
    except ModelHealthError as exc:
        sys.exit(f"Failed to download archive: {exc}")

    out_dir = os.path.join(os.path.dirname(__file__), "downloads")
    os.makedirs(out_dir, exist_ok=True)
    slug = (session.name or session.id).replace(" ", "_")
    filename = os.path.join(out_dir, f"{slug}.zip")
    with open(filename, "wb") as f:
        f.write(data)

    print(f"  Saved {filename}  ({len(data):,} bytes)")
    print("\nDone.")


if __name__ == "__main__":
    main()
