#!/usr/bin/env python3
"""Model Health Python SDK — browse subject groups.

Walks through what a group list can be asked for:
  1. Every group: how many match, and what the first few look like
  2. How many match each search — the only filter a group list takes
  3. Which group comes first under each order

Usage:
    list_groups.py [<api_key>]
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
    """Reads at most `count` groups, then lets the rest go."""
    taken = []
    for group in stream:
        taken.append(group)
        if len(taken) == count:
            break
    return taken


def _describe(group):
    last = group.last_activity.date() if group.last_activity else "no activity yet"
    return (
        f"{group.name}  {group.subject_count} subjects  "
        f"{group.total_activities} activities  {last}"
    )


# ---------------------------------------------------------------------------
# What a list can be asked
# ---------------------------------------------------------------------------

def _show_everything(client):
    print("\nEvery subject group")
    stream = client.groups.list()
    print(f"  {stream.total} match")
    for group in _first_few(stream, 5):
        print(f"    {_describe(group)}")


def _show_filters(client):
    print("\nHow many match each search")
    for term in ("test", "group", "zzz-nothing-matches-this"):
        print(f"  {term:<26} {client.groups.list(search=term).total}")


def _show_order(client):
    print("\nFirst group under each order")
    for order_by in ("name", "-name"):
        first = _first_few(client.groups.list(order_by=order_by), 1)
        print(f"  {order_by:<8} {_describe(first[0]) if first else '(nothing matched)'}")


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
        sys.exit(f"Failed to list groups: {exc}")


if __name__ == "__main__":
    main()
