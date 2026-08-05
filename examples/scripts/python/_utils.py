"""Shared utilities for Model Health example scripts."""

import os
import sys
import time

# All example scripts save their output here.
DOWNLOADS_DIR = os.path.join(os.path.dirname(__file__), "downloads")

# Path to the optional .env config file.
_ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")


def _load_env_file():
    """Parse the .env file and return a dict of key/value pairs."""
    if not os.path.exists(_ENV_FILE):
        return {}
    env = {}
    with open(_ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            env[key.strip()] = value
    return env


_ENV_CACHE = None


def _env():
    global _ENV_CACHE
    if _ENV_CACHE is None:
        _ENV_CACHE = _load_env_file()
    return _ENV_CACHE


def load_api_key(cli_arg=None):
    """Return the Model Health API key.

    Resolution order: CLI argument → .env file → environment variable.
    Exits with an error message if no key is found.
    """
    key = cli_arg or _env().get("MODEL_HEALTH_API_KEY") or os.environ.get("MODEL_HEALTH_API_KEY")
    if not key:
        sys.exit(
            "Model Health API key not found.\n"
            "Provide it as a CLI argument or set MODEL_HEALTH_API_KEY in .env or your environment."
        )
    return key


# File extensions for motion data types (keyed by MotionData.type string).
MOTION_DATA_EXT = {
    "animation":      "json",
    "kinematics_mot": "mot",
    "kinematics_csv": "csv",
    "markers_trc":    "trc",
    "markers_csv":    "csv",
    "model":          "osim",
}

# File extensions for analysis data types (keyed by AnalysisData.type string).
ANALYSIS_DATA_EXT = {
    "report":  "pdf",
    "data":    "zip",
}


def poll_analysis(client, task, interval=10):
    """Block until the analysis task finishes.

    Returns the final status (AnalysisStatus.completed or AnalysisStatus.failed).
    """
    from modelhealth import AnalysisStatus

    while True:
        status = client.analysis_status(task)
        if status == AnalysisStatus.processing:
            print("  Analysing...  ", end="\r", flush=True)
        else:
            print()  # clear the \r line
            return status
        time.sleep(interval)


def save_file(filename, data):
    """Save bytes to the downloads directory.

    Creates the downloads directory if it does not exist.

    Args:
        filename: Filename (not a full path) to write inside the downloads directory.
        data: Raw bytes to write.

    Returns:
        The full path of the saved file.
    """
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    path = os.path.join(DOWNLOADS_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)
    return path
