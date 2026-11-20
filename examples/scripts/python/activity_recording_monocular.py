#!/usr/bin/env python3
"""Model Health Python SDK — single-phone (monocular) capture workflow demo.

Like activity_recording.py, but with ONE phone and no neutral (static) pose:
  1. Create a session (QR code saved locally for pairing)
  2. Pair a single phone using the Model Health companion iOS app
  3. Calibrate that phone using a checkerboard pattern
  4. Select an existing subject or create a new one, and assign it to the session
  5. Record one or more movement activities in a loop (engine v2.0, 60 fps or more).
     After each one the script waits only for the upload, then you can record the
     next trial while the earlier ones are processed on the server
  6. When you stop recording: wait for the processing of every activity, optionally
     run analysis, then optionally update each activity's metadata

How it differs from the multi-camera workflow:
  * There is no subject calibration (neutral pose). It needs two or more cameras,
    and the monocular fit scales the body from the subject's height instead, so enter
    the height accurately.
  * The API will not record activities before a neutral trial is done, so an empty
    placeholder neutral trial is posted after calibration. Core ignores it.
  * Every recording asks for core engine v2.0 when the installed SDK can (otherwise core
    chooses it). Core reconstructs a session calibrated with one camera as a monocular trial.
  * The subject must stay in the phone's view for the whole movement.
  * Without a neutral pose nothing chooses between the checkerboard's two possible
    camera solutions, so the first is used. Check the result looks upright.

Requires the Model Health core with monocular support (feat/monocular-v2) to be deployed.

Usage:
    activity_recording_monocular.py [<api_key>]
"""

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from docopt import docopt

from modelhealth import (
    ActivityConfig,
    ActivityStatus,
    ActivityStatusUploading,
    CalibrationStatusUploading,
    ModelHealthError,
    RecordingConfig,
    SessionCoreEngine,
    SessionFramerate,
)
from _prompts import confirm, pick_one
from _utils import load_api_key, load_api_url

# Generic steps that are identical to the multi-camera workflow.
from activity_recording import (
    _ACTIVITY_TYPES,
    _FILTER_FREQUENCIES,
    _calibration_callback,
    _configure_checkerboard,
    _connect,
    _create_session_and_save_qr_code,
    _pick_or_create_subject,
    _start_recording,
    _stop_recording,
    _update_activity_metadata,
    _wait_and_process_results,
)

# The monocular fit needs 60 Hz or more; every SDK framerate qualifies.
_FRAMERATES = [
    (SessionFramerate.fps_60,  "60 fps   (recordings up to ~60 s)"),
    (SessionFramerate.fps_120, "120 fps  (recordings up to ~30 s)"),
    (SessionFramerate.fps_240, "240 fps  (recordings up to ~15 s)"),
]


# ---------------------------------------------------------------------------
# Single-phone pairing and calibration
# ---------------------------------------------------------------------------

def _wait_for_phone_pairing():
    print("  Pair ONE phone using the Model Health companion iOS app before continuing.")
    input("\nPress Enter when the phone is ready...")


def _calibrated_camera_count(api_key, session):
    """Number of cameras in the session's calibration, as the server counts them (None if unavailable)."""
    url = f"{load_api_url()}/sessions/{session.id}/get_n_calibrated_cameras/"
    request = urllib.request.Request(url, headers={"X-API-Key": api_key})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read()).get("data")
    except (urllib.error.URLError, ValueError, OSError):
        return None


def _calibrate_camera(api_key, client, session, checkerboard):
    input("\nPlace the checkerboard in view of the phone, then press Enter to calibrate...")
    print("Calibrating camera...")
    warned = []

    def callback(status):
        if isinstance(status, CalibrationStatusUploading) and status.total != 1 and not warned:
            warned.append(True)
            print(f"\n  Warning: {status.total} cameras are paired. This workflow is for a single phone.")
        _calibration_callback(status)

    try:
        client.calibrate_camera(session, checkerboard, callback)
    except ModelHealthError as exc:
        # The SDK ends calibrate_camera with its own check that two or more cameras were calibrated,
        # which a single phone never passes even though the server has calibrated it. Accept that
        # one error only after the server confirms exactly one calibrated camera.
        if "Not enough cameras" not in str(exc):
            sys.exit(f"Camera calibration failed: {exc}")
        count = _calibrated_camera_count(api_key, session)
        if count != 1:
            sys.exit(f"Camera calibration failed: {exc} (the server reports {count} calibrated cameras, expected 1)")
        print("  The SDK expects two or more cameras; the server calibrated the single camera, so continuing.")
    print("Camera calibration complete.")


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

def _post_placeholder_neutral(api_key, session):
    """Post an empty `neutral` trial, marked done, so the API accepts activity recordings.

    The API refuses to record activities until the session has a processed neutral trial,
    which needs two or more cameras. A one-camera session has none, so this stands in for
    it. It has no videos. Core ignores the neutral of a one-camera session when it
    processes a trial, and fills in the metadata and model that the analysis functions
    load from it (the first time a trial of the session is processed).
    """
    payload = json.dumps({
        "session": str(session.id),
        "name": "neutral",
        "status": "done",
        "notes": "Placeholder for a single-camera session (no static pose). Created by activity_recording_monocular.py.",
    }).encode()
    request = urllib.request.Request(
        f"{load_api_url()}/activities/", data=payload, method="POST",
        headers={"X-API-Key": api_key, "Content-Type": "application/json"},
    )
    print("Posting a placeholder neutral trial (single-camera session)...")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        sys.exit(f"Failed to post the placeholder neutral trial (HTTP {exc.code}): {exc.read()[:300].decode(errors='replace')}")
    except urllib.error.URLError as exc:
        sys.exit(f"Failed to post the placeholder neutral trial: {exc.reason}")


def _assign_subject(api_key, session, subject):
    """Attach the subject to the session.

    The SDK only does this while recording the neutral pose, which a one-camera session
    does not have, so this makes the same API call the SDK makes. Core needs the subject
    on the session to get the height the monocular fit scales to.
    """
    query = urllib.parse.urlencode({"subject_id": subject.id})
    url = f"{load_api_url()}/sessions/{session.id}/set_subject/?{query}"
    request = urllib.request.Request(url, headers={"X-API-Key": api_key})
    print(f"Assigning {subject.name} to the session...")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        sys.exit(f"Failed to assign the subject (HTTP {exc.code}): {exc.read()[:300].decode(errors='replace')}")
    except urllib.error.URLError as exc:
        sys.exit(f"Failed to assign the subject: {exc.reason}")

    session = session.refresh()
    if session.subject_id != subject.id:
        print(f"  Warning: the session reports subject {session.subject_id}, expected {subject.id}.")
    return session


# ---------------------------------------------------------------------------
# Recording
# ---------------------------------------------------------------------------

def _prompt_recording_config():
    """Returns (activity_name, activity_type_value, activity_type_label, recording_config)."""
    activity_name = input("\nActivity name (e.g. cmj, squat): ").strip() or "activity"

    print("\nAutomatic analysis (optional):\n")
    activity_type_value, activity_type_label = pick_one(
        _ACTIVITY_TYPES,
        "Select activity type",
        lambda t: t[1],
    )

    print("\nFramerate:\n")
    framerate_value, _ = pick_one(_FRAMERATES, "Select framerate", lambda t: t[1], default=_FRAMERATES[0])

    print("\nFilter frequency override (optional):\n")
    filter_value, _ = pick_one(_FILTER_FREQUENCIES, "Select filter frequency", lambda t: t[1])

    # Engine v2.0 is what reconstructs a one-camera session. Newer SDK builds can request it per
    # recording; older ones (e.g. the 0.12.0rc2 dev build) cannot, and core then moves a
    # one-camera session to v2.0 by itself.
    if hasattr(SessionCoreEngine, "v2_0"):
        recording_config = RecordingConfig(
            framerate=framerate_value, filter_frequency=filter_value, core_engine=SessionCoreEngine.v2_0,
        )
    else:
        recording_config = RecordingConfig(framerate=framerate_value, filter_frequency=filter_value)
    return activity_name, activity_type_value, activity_type_label, recording_config


def _wait_for_upload(client, activity, interval=3):
    """Block until the videos are uploaded. Processing carries on server-side."""
    print("\nWaiting for the upload (the next trial can start as soon as it is done)...")
    while True:
        try:
            status = client.activity_status(activity)
        except ModelHealthError as exc:
            print(f"\n  Could not read the upload status: {exc}")
            return
        if not isinstance(status, ActivityStatusUploading):
            print("  Upload done. Processing continues on the server.            ")
            return
        print(f"  Uploading ({status.uploaded}/{status.total} cameras)...  ", end="\r", flush=True)
        time.sleep(interval)


def _report_finished(client, pending):
    """Print, once, each earlier activity that has left upload and processing (no waiting)."""
    for item in pending:
        if item["reported"]:
            continue
        try:
            status = client.activity_status(item["activity"])
        except ModelHealthError:
            continue
        if isinstance(status, ActivityStatusUploading) or status == ActivityStatus.processing:
            continue
        item["reported"] = True
        name = item["activity"].name or item["activity"].id
        print(f"  Earlier activity '{name}' finished processing: {status}")


def _finish_pending(client, pending):
    """Wait for the earlier activities, run any analysis and offer the metadata update."""
    for item in pending:
        name = item["activity"].name or item["activity"].id
        print(f"\n--- {name} ---")
        activity = _wait_and_process_results(client, item["activity"], item["label"])
        _update_activity_metadata(client, activity)
    pending.clear()


def _record_one(client, session, subject, pending):
    """Run a single record → upload cycle; processing carries on while the next trial is recorded.

    The activity is added to `pending`, which `_finish_pending` collects later.
    Returns True to continue recording, False to quit.
    """
    _report_finished(client, pending)
    activity_name, activity_type_value, activity_type_label, recording_config = _prompt_recording_config()
    print(f"\nKeep {subject.name} in the phone's view for the whole movement.")

    activity = _start_recording(client, session, subject, activity_name, activity_type_value, recording_config)
    if activity is None:
        return confirm("\nRecord another activity?", default=True)

    if not _stop_recording(client, session):
        return confirm("\nRecord another activity?", default=True)

    _wait_for_upload(client, activity)
    pending.append({"activity": activity, "label": activity_type_label, "reported": False})

    return confirm("\nRecord another activity?", default=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(api_key):
    print(f"Server for the subject assignment: {load_api_url()}")
    print("  (the SDK's own server is fixed by the installed build: release = production, pre-release = dev)")
    client = _connect(api_key)

    session = _create_session_and_save_qr_code(client)
    _wait_for_phone_pairing()

    checkerboard = _configure_checkerboard()
    _calibrate_camera(api_key, client, session, checkerboard)
    _post_placeholder_neutral(api_key, session)

    while True:
        subject = _pick_or_create_subject(client)
        session = _assign_subject(api_key, session, subject)

        pending = []
        while _record_one(client, session, subject, pending):
            pass
        if pending:
            print(f"\nCollecting the results of {len(pending)} recorded {'activity' if len(pending) == 1 else 'activities'}...")
            _finish_pending(client, pending)

        if not confirm("\nRecord another subject with the same camera calibration?", default=True):
            break
        session = client.new_session_from_session(session)
        _post_placeholder_neutral(api_key, session)

    print("\nDone.")


if __name__ == "__main__":
    args = docopt(__doc__)
    main(load_api_key(args["<api_key>"]))
