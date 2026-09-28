#!/usr/bin/env python3
"""Model Health Python SDK — check account usage and plan state.

Fetches the authenticated account's current billing/quota state via `usage`
and prints it, including whether recording is currently allowed.

Usage:
    get_usage.py [<api_key>]
"""

import sys

from docopt import docopt

from modelhealth import ModelHealthError, ModelHealthClient
from _utils import load_api_key, attach_logging


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

def _connect(api_key):
    print("Connecting...")
    try:
        client = ModelHealthClient(api_key)
        attach_logging(client)
        return client
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")


# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------

def _fetch_usage(client):
    try:
        return client.usage()
    except ModelHealthError as exc:
        sys.exit(f"Failed to fetch usage: {exc}")


def _print_usage(usage):
    print(f"  Recording allowed:  {usage.recording_allowed}")
    if not usage.recording_allowed:
        print(f"  Reason:              {usage.reason}")
    print(f"  Plan:                {usage.plan_name or '(no active plan)'}")
    print(f"  Activities used:     {usage.activities_used if usage.activities_used is not None else '(none)'}")
    print(f"  Activities max:      {usage.activities_max if usage.activities_max is not None else '(unlimited/none)'}")
    print(f"  Period end:          {usage.period_end if usage.period_end is not None else '(none)'}")
    print(f"  Reset period:        {usage.reset_period if usage.reset_period is not None else '(none)'}")
    print(f"  Free trial:          {usage.is_free_trial}")
    print(f"  Auto-renews:         {usage.will_auto_renew}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    client = _connect(api_key)
    usage = _fetch_usage(client)
    print()
    _print_usage(usage)


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
