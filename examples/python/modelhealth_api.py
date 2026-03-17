import logging
import time

import requests


def get_trial_status(trial_id, api_url, api_token, retries=10, retry_delay=5):
    """Fetch the current status of a trial from the ModelHealth API.

    Args:
        trial_id: UUID of the trial.
        api_url: Base URL of the ModelHealth API.
        api_token: ModelHealth authentication token.
        retries: Number of attempts before raising on connection error.
        retry_delay: Seconds to wait between retries.

    Returns:
        Trial status as a string (e.g. 'stopped', 'processing', 'done').

    Raises:
        Exception: If all retry attempts fail.
    """
    headers = {"Authorization": f"Token {api_token}"}
    for attempt in range(retries):
        try:
            r = requests.get(f"{api_url}trials/{trial_id}/", headers=headers).json()
            return r["status"]
        except Exception as e:
            if attempt < retries - 1:
                print(f"Connection error getting trial status, retrying in {retry_delay}s: {e}")
                time.sleep(retry_delay)
            else:
                raise


def upload_video_to_trial(file_path, trial_id, device_id, parameters, api_url, api_token, max_retries=2):
    """Upload a video file to a trial via the ModelHealth API.

    Args:
        file_path: Local path to the video file.
        trial_id: UUID of the trial.
        device_id: Identifier of the camera/device that recorded the video.
        parameters: JSON-encoded camera parameters to associate with the video.
        api_url: Base URL of the ModelHealth API.
        api_token: ModelHealth authentication token.
        max_retries: Number of upload attempts before raising on failure.

    Returns:
        API response as a dict.

    Raises:
        Exception: If all upload attempts fail.
    """
    headers = {"Authorization": f"Token {api_token}"}
    data = {"trial": trial_id, "device_id": device_id, "parameters": parameters}
    for attempt in range(max_retries):
        try:
            with open(file_path, "rb") as video_file:
                res = requests.post(f"{api_url}videos/", files={"video": video_file}, data=data, headers=headers)
            if res.status_code == 201:
                logging.info(f"Video uploaded successfully for trial {trial_id}.")
                return res.json()
            raise Exception(f"Failed to upload video: {res.status_code} {res.text}")
        except Exception as e:
            logging.warning(f"Attempt {attempt + 1} to upload video failed: {e}")
            if attempt == max_retries - 1:
                raise
            time.sleep(1)
