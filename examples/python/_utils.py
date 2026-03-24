"""Shared utilities for Model Health example scripts."""

import getpass
import os
import sys

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


def load_opencap_token(cli_arg=None):
    """Return the OpenCap authentication token.

    Resolution order: CLI argument → .env file → environment variable.
    If no token is found, prompts the user to log in with their OpenCap
    credentials, then saves the token to the .env file for future use.
    """
    token = cli_arg or _env().get("OPENCAP_TOKEN") or os.environ.get("OPENCAP_TOKEN")
    if not token:
        token = _opencap_login_and_save()
    return token


def _opencap_login_and_save():
    """Prompt for OpenCap credentials, authenticate, save token to .env and return it."""
    import requests

    print(
        "No OpenCap token found in .env or environment.\n"
        "Log in with the credentials you use at app.opencap.ai.\n"
    )
    try:
        username = getpass.getpass(prompt="OpenCap username: ")
        password = getpass.getpass(prompt="OpenCap password: ")
        resp = requests.post(
            "https://api.opencap.ai/login/",
            data={"username": username, "password": password},
        )
        resp.raise_for_status()
        token = resp.json()["token"]
    except Exception as e:
        sys.exit(f"OpenCap login failed: {e}")

    # Append (or create) the token in the .env file.
    env_lines = []
    if os.path.exists(_ENV_FILE):
        with open(_ENV_FILE) as f:
            env_lines = f.readlines()

    # Remove any existing OPENCAP_TOKEN line so we don't duplicate it.
    env_lines = [l for l in env_lines if not l.startswith("OPENCAP_TOKEN")]

    with open(_ENV_FILE, "w") as f:
        f.writelines(env_lines)
        if env_lines and not env_lines[-1].endswith("\n"):
            f.write("\n")
        f.write(f'OPENCAP_TOKEN="{token}"\n')

    print(f"Login successful. Token saved to {_ENV_FILE}.")
    return token

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
    "metrics": "json",
    "report":  "pdf",
    "data":    "zip",
}


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
