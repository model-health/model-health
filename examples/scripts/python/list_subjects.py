#!/usr/bin/env python3
"""Model Health Python SDK — browse subjects.

Walks through what a subject list can be asked for:
  1. Every subject: how many match, and what the first few look like
  2. How many match each filter, without reading any of them
  3. Which subject comes first under each order

Usage:
    list_subjects.py [<api_key>]
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
    """Reads at most `count` subjects, then lets the rest go."""
    taken = []
    for subject in stream:
        taken.append(subject)
        if len(taken) == count:
            break
    return taken


def _describe(subject):
    height = subject.height if subject.height is not None else "(no height)"
    weight = subject.weight if subject.weight is not None else "(no weight)"
    return f"{subject.name}  (ID {subject.id})  {height} / {weight}"


# ---------------------------------------------------------------------------
# What a list can be asked
# ---------------------------------------------------------------------------

def _show_everything(client):
    print("\nEvery subject")
    stream = client.subjects.list()
    print(f"  {stream.total} match")
    for subject in _first_few(stream, 5):
        print(f"    {_describe(subject)}")


def _show_filters(client):
    print("\nHow many match each filter")
    counts = [
        ('named "test"', client.subjects.list(search="test")),
        ("added in 2025", client.subjects.list(
            created_after=date(2025, 1, 1), created_before=date(2025, 12, 31)
        )),
        ("with a completed activity", client.subjects.list(activity_complete=True)),
    ]
    for label, stream in counts:
        print(f"  {label:<26} {stream.total}")


def _show_order(client):
    print("\nFirst subject under each order")
    for order_by in ("name", "-name", "-created_at"):
        first = _first_few(client.subjects.list(order_by=order_by), 1)
        print(f"  {order_by:<14} {_describe(first[0]) if first else '(nothing matched)'}")


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
    except ModelHealthError as exc:
        sys.exit(f"Failed to list subjects: {exc}")


if __name__ == "__main__":
    main()
