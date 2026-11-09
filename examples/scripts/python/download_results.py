#!/usr/bin/env python3
"""Model Health Python SDK — save an activity's results.

Takes the most recent activity whose processing has finished and:
  1. Fetches its results into memory, saying why any is missing
  2. Saves them into a directory, one file each

Usage:
    download_results.py [<api_key>] [--directory=<path>]

Options:
    --directory=<path>  Where to save the files [default: results]
"""

import sys

from docopt import docopt

from modelhealth import ArtifactType, ModelHealthClient, ModelHealthError
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


def _latest_finished(client):
    """The newest activity whose processing has finished, or None when there is none."""
    for activity in client.activities.list(order_by="-created_at", only_completed=True, limit=1):
        return activity
    return None


# ---------------------------------------------------------------------------
# What an activity's results can be asked for
# ---------------------------------------------------------------------------

def _show_fetched(client, activity):
    print("\nFetched into memory")
    fetched = client.fetch_artifacts(activity, list(ArtifactType))
    for kind, data in fetched.data.items():
        print(f"  {kind:<15} {len(data):>9} bytes")
    for kind, error in fetched.errors.items():
        print(f"  {kind:<15} not fetched: {error}")


def _show_saved(client, activity, directory):
    print(f"\nSaved into {directory}")
    saved = client.download_activity(activity, directory, list(ArtifactType))
    for kind, path in saved.paths.items():
        print(f"  {kind:<15} {path}")
    for kind, error in saved.errors.items():
        print(f"  {kind:<15} not saved: {error}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    args = docopt(__doc__)
    client = _connect(load_api_key(args["<api_key>"]))

    try:
        activity = _latest_finished(client)
        if activity is None:
            print("No activity has finished processing yet.")
            return
        print(f"\nActivity {activity.name or activity.id}: has results = {activity.has_results}")
        _show_fetched(client, activity)
        _show_saved(client, activity, args["--directory"])
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch results: {exc}")


if __name__ == "__main__":
    main()
