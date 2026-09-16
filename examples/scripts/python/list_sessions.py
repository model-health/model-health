#!/usr/bin/env python3
"""Model Health Python SDK — browse sessions.

Walks through what a session list can be asked for:
  1. Every session: how many match, and what the first few look like
  2. How many belong to each subject — the only filter a session list takes
  3. Which session comes first under each order

Usage:
    list_sessions.py [<api_key>]
"""

import sys

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
    """Reads at most `count` sessions, then lets the rest go."""
    taken = []
    for session in stream:
        taken.append(session)
        if len(taken) == count:
            break
    return taken


def _describe(session):
    return (
        f"{session.name or session.id}  "
        f"{session.activities_count} activities  {session.created_at.date()}"
    )


# ---------------------------------------------------------------------------
# What a list can be asked
# ---------------------------------------------------------------------------

def _show_everything(client):
    print("\nEvery session")
    stream = client.sessions.list()
    print(f"  {stream.total} match")
    for session in _first_few(stream, 5):
        print(f"    {_describe(session)}")


def _show_subject_filter(client):
    print("\nHow many belong to each subject")
    subjects = client.subjects.list(limit=3).all()
    if not subjects:
        print("  (no subjects to filter by)")
        return
    for subject in subjects:
        print(f"  {subject.name:<24} {client.sessions.list(subject=subject).total}")


def _show_order(client):
    print("\nFirst session under each order")
    for order_by in ("created_at", "-created_at", "name"):
        first = _first_few(client.sessions.list(order_by=order_by), 1)
        print(f"  {order_by:<14} {_describe(first[0]) if first else '(nothing matched)'}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    args = docopt(__doc__)
    client = _connect(load_api_key(args["<api_key>"]))

    try:
        _show_everything(client)
        _show_subject_filter(client)
        _show_order(client)
    except ModelHealthError as exc:
        sys.exit(f"Failed to list sessions: {exc}")


if __name__ == "__main__":
    main()
