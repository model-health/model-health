import shutil
import time
import urllib.request

import requests


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

