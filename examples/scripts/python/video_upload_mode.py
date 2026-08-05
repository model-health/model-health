#!/usr/bin/env python3
"""Model Health Python SDK — video upload mode demo.

Walks through setting the video upload mode for your account:
  1. Pick a mode (enabled, disabled or flush)
  2. Apply it via `set_video_upload_mode`

Usage:
    video_upload_mode.py [<api_key>]
"""

import sys

from docopt import docopt

from modelhealth import (
    ModelHealthError,
    ModelHealthClient,
    VideoUploadMode,
)
from _prompts import pick_one
from _utils import load_api_key

_MODES = [VideoUploadMode.enabled, VideoUploadMode.disabled, VideoUploadMode.flush]

_MODE_DESCRIPTIONS = {
    VideoUploadMode.enabled: "Devices upload recorded video normally.",
    VideoUploadMode.disabled: "Devices stop uploading recorded video.",
    VideoUploadMode.flush: "Re-enables uploads, and uploads any videos queued locally while disabled.",
}


def main(api_key):
    print("Connecting...")
    try:
        client = ModelHealthClient(api_key)
    except ModelHealthError as exc:
        sys.exit(f"Failed to initialise: {exc}")

    print()
    mode = pick_one(_MODES, "Select video upload mode", lambda m: f"{m}  —  {_MODE_DESCRIPTIONS[m]}")

    print(f"\nSetting video upload mode to '{mode}'...")
    try:
        client.set_video_upload_mode(mode)
    except ModelHealthError as exc:
        sys.exit(f"Failed to set video upload mode: {exc}")

    print("Done.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
