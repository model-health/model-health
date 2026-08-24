#!/usr/bin/env python3
"""Model Health Python SDK — fetch a subject by ID demo.

Walks through resolving a subject ID into full subject details:
  1. Select a subject (to obtain a valid ID)
  2. Fetch that subject by ID via `fetch_subject` and print its details

Usage:
    fetch_subject.py [<api_key>]
"""

import sys

from docopt import docopt

from modelhealth import ModelHealthError, ModelHealthClient
from _prompts import pick_one
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


# ---------------------------------------------------------------------------
# Subject selection / lookup
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


def _fetch_subject(client, subject_id):
    print(f"\nFetching subject {subject_id}...")
    try:
        return client.fetch_subject(subject_id)
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch subject: {exc}")


def _print_subject(subject):
    print(f"  Name:             {subject.name}")
    print(f"  Weight:           {subject.weight if subject.weight is not None else '(none)'}")
    print(f"  Height:           {subject.height if subject.height is not None else '(none)'}")
    print(f"  Birth year:       {subject.birth_year if subject.birth_year is not None else '(none)'}")
    print(f"  Age:              {subject.age if subject.age is not None else '(none)'}")
    print(f"  Gender:           {subject.gender}")
    print(f"  Sex at birth:     {subject.sex_at_birth}")
    print(f"  Characteristics:  {subject.characteristics or '(none)'}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    client = _connect(api_key)
    subject = _pick_subject(client)

    fetched = _fetch_subject(client, subject.id)
    print()
    _print_subject(fetched)


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
