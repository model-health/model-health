import getpass
import os
import shutil
import sys
import time
import urllib.request

import requests

from _utils import _env, _ENV_FILE


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


def fetch_session(session_id, api_url="https://api.opencap.ai/", api_token=None, max_retries=3, retry_delay=5):
    """Fetch session data from OpenCap, including its list of trials sorted by creation time.

    Args:
        session_id: UUID of the OpenCap session.
        api_url: Base URL of the OpenCap API.
        api_token: OpenCap authentication token.
        max_retries: Number of attempts before raising on connection error.
        retry_delay: Seconds to wait between retries.

    Returns:
        Session data as a dict, with trials sorted by created_at.

    Raises:
        Exception: If the session ID is invalid or the session is not accessible.
    """
    headers = {"Authorization": f"Token {api_token}"}
    for attempt in range(max_retries):
        try:
            resp = requests.get(f"{api_url}sessions/{session_id}/", headers=headers)
            if resp.status_code == 500:
                raise Exception("No server response. Likely not a valid session ID.")
            session = resp.json()
            if "trials" not in session:
                raise Exception(
                    "This session is not in your account, nor is it public. You do not have access."
                )
            session["trials"].sort(key=lambda t: t["created_at"])
            return session
        except requests.RequestException as e:
            if attempt < max_retries - 1:
                print(f"Connection error fetching session, retrying in {retry_delay}s: {e}")
                time.sleep(retry_delay)
            else:
                raise


def fetch_subject(subject_id, api_url="https://api.opencap.ai/", api_token=None, max_retries=3, retry_delay=5):
    """Fetch subject data from OpenCap.

    Args:
        subject_id: UUID of the OpenCap subject.
        api_url: Base URL of the OpenCap API.
        api_token: OpenCap authentication token.
        max_retries: Number of attempts before raising on connection error.
        retry_delay: Seconds to wait between retries.

    Returns:
        Subject data as a dict.

    Raises:
        Exception: If the subject ID is invalid.
    """
    headers = {"Authorization": f"Token {api_token}"}
    for attempt in range(max_retries):
        try:
            resp = requests.get(f"{api_url}subjects/{subject_id}/", headers=headers)
            if resp.status_code == 500:
                raise Exception("No server response. Likely not a valid subject ID.")
            return resp.json()
        except requests.RequestException as e:
            if attempt < max_retries - 1:
                print(f"Connection error fetching subject, retrying in {retry_delay}s: {e}")
                time.sleep(retry_delay)
            else:
                raise

