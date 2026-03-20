"""Model Health Python SDK — Import an OpenCap session into Model Health.

Usage:
    opencap_import.py <api_key> <opencap_token> <opencap_session_id>
"""

import json

from docopt import docopt

import time

from modelhealth import (
    ModelHealthService,
    SubjectParameters,
    SessionConfig,
    SessionOpenSimModel,
    SessionScalingSetup,
    SessionCoreEngine,
    FilterFrequencyDefault,
    FilterFrequencyHz,
    ImportStatusCreatedSession,
    ImportStatusUploading,
    ActivityType,
    ActivityStatus,
    ActivityStatusUploading,
    ActivityStatusAnalyzing,
    AnalysisStatus,
)
from _opencap_api import fetch_session, fetch_subject
from _prompts import confirm, pick_one


_OPENSIM_MODEL_MAP = {
    "LaiUhlrich2022_shoulder": SessionOpenSimModel.lai_uhlrich_2022_shoulder,
    "LaiUhlrich2022": SessionOpenSimModel.lai_uhlrich_2022,
}

_SCALING_SETUP_MAP = {
    "upright_standing_pose": SessionScalingSetup.upright_standing_pose,
    "any_pose": SessionScalingSetup.any_pose,
}

_CORE_ENGINE_MAP = {
    "v0.2": SessionCoreEngine.v0_2,
    "v0.3": SessionCoreEngine.v0_3,
    "v1.0": SessionCoreEngine.v1_0,
}


def _filter_frequency_from_meta(value):
    if value is None or value == "default":
        return FilterFrequencyDefault()
    try:
        return FilterFrequencyHz(int(value))
    except (TypeError, ValueError):
        return FilterFrequencyDefault()


def _pick_trial(trials, name_filter):
    """Return the best matching trial: prefer done status, then latest created_at."""
    matches = [t for t in trials if name_filter(t["name"].lower())]
    done = [t for t in matches if t.get("status") == "done"]
    pool = done if done else matches
    if not pool:
        return None
    return max(pool, key=lambda t: t.get("created_at", ""))



def copy_session(
    mh_service,
    session_id_input,
    user_token_input,
    api_url_input="https://api.opencap.ai/",
    meta_overrides=None,
    trials_to_import=None,
    trial_meta_overrides=None,
):
    """Copy an OpenCap session into a ModelHealth account.

    Downloads all trials from the given OpenCap session and re-uploads them to
    a new ModelHealth session via :meth:`ModelHealthService.import_session`.

    Args:
        mh_service: An active :class:`ModelHealthService` instance.
        session_id_input: UUID of the OpenCap session to copy from.
        user_token_input: OpenCap authentication token.
        api_url_input: Base URL of the OpenCap API.
        meta_overrides: Optional dict of settings to set under meta["settings"] on the new
            session, overriding or extending what is copied from the source session. Supported keys:
                - "openSimModel": "LaiUhlrich2022_shoulder" | "LaiUhlrich2022"
                - "scalingsetup": "upright_standing_pose" | "any_pose"
                - "coreengine": "v0.2" | "v0.3" | "v1.0"
                - "filterfrequency": "default" | <integer>
        trials_to_import: Optional list of trial names to import. Setup trials
            (calibration, neutral) are always included. Set to None to import all trials.
        trial_meta_overrides: Optional dict keyed by trial name. Each value is a dict of
            per-trial overrides. Supported keys:
                - "activity_type": ActivityType — triggers automatic analysis after processing.
    """
    # Fetch source session
    session_input = fetch_session(session_id_input, api_url=api_url_input, api_token=user_token_input)

    # Step 1: Build session config from source settings, applying any overrides
    meta = session_input.get("meta") or {}
    if isinstance(meta, str):
        meta = json.loads(meta) if meta else {}
    settings = dict(meta.get("settings") or {})
    if meta_overrides:
        settings.update(meta_overrides)
        print(f"Applying settings overrides: {meta_overrides}")

    session_config = SessionConfig(
        opensim_model=_OPENSIM_MODEL_MAP.get(settings.get("openSimModel"), SessionOpenSimModel.lai_uhlrich_2022_shoulder),
        scaling_setup=_SCALING_SETUP_MAP.get(settings.get("scalingsetup"), SessionScalingSetup.upright_standing_pose),
        core_engine=_CORE_ENGINE_MAP.get(settings.get("coreengine"), SessionCoreEngine.v0_3),
        filter_frequency=_filter_frequency_from_meta(settings.get("filterfrequency")),
    )
    print("Session settings configured.")

    # Step 2: Select or create subject
    subjects = mh_service.subject_list()
    if subjects and confirm(f"Found {len(subjects)} subject(s). Select an existing one?", default=True):
        print()
        subject = pick_one(subjects, "Select subject", lambda s: f"{s.name}  (ID {s.id})")
        print(f"  Using: {subject.name}")
    else:
        # Copy subject from the OpenCap session.
        # OpenCap stores height in metres; SubjectParameters expects centimetres.
        subject_data = fetch_subject(session_input["subject"], api_url=api_url_input, api_token=user_token_input)
        params = SubjectParameters(
            name=subject_data.get("name") or subject_data.get("first_name", ""),
            weight=float(subject_data.get("weight") or 0),
            height=float(subject_data.get("height") or 0) * 100,
            birth_year=subject_data.get("birth_year"),
        )
        subject = mh_service.create_subject(params)
        print("Subject created successfully.")

    # Step 3: Resolve calibration — prefer parent session referenced in meta, fall back to current session
    calibration_trial = None
    parent_calibration_id = (meta.get("sessionWithCalibration") or {}).get("id")

    if parent_calibration_id:
        try:
            parent_session = fetch_session(parent_calibration_id, api_url=api_url_input, api_token=user_token_input)
            cal = _pick_trial(parent_session["trials"], lambda n: n == "calibration")
            if cal is not None:
                calibration_trial = cal
                print(f"Using calibration from parent session {parent_calibration_id}.")
        except Exception as e:
            print(f"Could not load calibration from parent session: {e}")

    if calibration_trial is None:
        cal = _pick_trial(session_input["trials"], lambda n: n == "calibration")
        if cal is not None:
            calibration_trial = cal

    # Build ordered trial list: calibration -> neutral -> dynamic
    # Skip setup trials that aren't done on the source side.
    neutral_trial = _pick_trial(session_input["trials"], lambda n: "neutral" in n)
    dynamic_trials = [
        t for t in session_input["trials"]
        if t["name"].lower() not in ("calibration", "neutral")
        and (trials_to_import is None or t["name"] in trials_to_import)
    ]
    if calibration_trial is None:
        print("No calibration trial found, cannot proceed.")
        return
    if calibration_trial.get("status") != "done":
        print("Calibration trial is not done, cannot proceed.")
        return
    if neutral_trial is None:
        print("No neutral trial found, cannot proceed.")
        return
    if neutral_trial.get("status") != "done":
        print("Neutral trial is not done, cannot proceed.")
        return

    # Step 4: Transfer all trials in one call
    # Build the full source session meta with settings overrides applied so the
    # backend has all the context it needs (e.g. sessionWithCalibration).
    session_meta = dict(meta)
    session_meta.setdefault("settings", {}).update(meta_overrides or {})

    # Annotate trials with per-trial overrides (e.g. activity_type).
    # Setup trials are never annotated — only dynamic trials support activity_type.
    def _annotate_trial(trial):
        print(f"Preparing trial {trial['name']} for import...")
        overrides = (trial_meta_overrides or {}).get(trial["name"], {})
        if not overrides:
            print(f"No overrides for trial {trial['name']}, importing as-is.")
            return trial
        trial = dict(trial)
        if "activity_type" in overrides:
            print(f"Applying activity_type {overrides['activity_type']} to trial {trial['name']}")
            trial["activity_type"] = str(overrides["activity_type"])
        else:
            print(f"No activity_type override for trial {trial['name']}, importing as-is.")
        return trial

    annotated_trials = [_annotate_trial(t) for t in dynamic_trials]

    _seen_uploads = {}
    _current_trial = [None]
    def on_status(status):
        if status == "creating_session":
            print("  Creating session...")
        elif isinstance(status, ImportStatusCreatedSession):
            print(f"  Session created: {status.session_id}")
        elif isinstance(status, ImportStatusUploading) and status.uploaded < status.total:
            _current_trial[0] = status.trial
            if _seen_uploads.get(status.trial) != status.uploaded:
                _seen_uploads[status.trial] = status.uploaded
                print(f"  [{status.trial}] Uploading video {status.uploaded + 1}/{status.total}...")
        elif status == "processing":
            trial = _current_trial[0] or "activity"
            print(f"  [{trial}] Processing...")

    session = mh_service.import_session(
        json.dumps([calibration_trial, neutral_trial, *annotated_trials]),
        subject,
        session_config=session_config,
        session_meta_json=json.dumps(session_meta),
        status_callback=on_status,
    )
    print("All activities imported successfully to session: ", session.id)
    return session


def wait_for_activities(mh_service, session, poll_interval=5):
    """Poll activity status for all dynamic activities until each is ready or failed.

    Args:
        mh_service: An active :class:`ModelHealthService` instance.
        session: The Session returned by :func:`copy_session`.
        poll_interval: Seconds between status polls. Default: 5.
    """
    pending = [a for a in session.activities if a.name.lower() not in ("calibration", "neutral")]

    if not pending:
        return

    # Phase 1: wait for processing to finish.
    # Activities that move to Analyzing are collected for a second pass.
    print("Waiting for activities to process...")
    analyzing = []  # list of (activity, task) pairs
    while pending:
        still_pending = []
        for activity in pending:
            status = mh_service.activity_status(activity)
            if isinstance(status, ActivityStatusUploading):
                print(f"  [{activity.name}] Uploading ({status.uploaded}/{status.total})...")
                still_pending.append(activity)
            elif status == ActivityStatus.processing:
                print(f"  [{activity.name}] Processing...")
                still_pending.append(activity)
            elif isinstance(status, ActivityStatusAnalyzing):
                print(f"  [{activity.name}] Analyzing — queued for analysis poll.")
                analyzing.append((activity, status.task))
            elif status == ActivityStatus.ready:
                print(f"  [{activity.name}] Ready.")
            elif status == ActivityStatus.failed:
                print(f"  [{activity.name}] Failed.")
        if still_pending:
            time.sleep(poll_interval)
        pending = still_pending

    # Phase 2: poll analysis status for activities that are analyzing.
    if not analyzing:
        return

    print("Waiting for analyses to complete...")
    pending_analysis = list(analyzing)
    while pending_analysis:
        still_pending = []
        for activity, task in pending_analysis:
            status = mh_service.analysis_status(task)
            if status == AnalysisStatus.processing:
                print(f"  [{activity.name}] Analyzing...")
                still_pending.append((activity, task))
            elif status == AnalysisStatus.completed:
                print(f"  [{activity.name}] Analysis complete.")
            else:
                print(f"  [{activity.name}] Analysis failed.")
        if still_pending:
            time.sleep(poll_interval)
        pending_analysis = still_pending


if __name__ == "__main__":
    args = docopt(__doc__)

    # Optional: override or extend session metadata with ModelHealth-specific settings.
    # Leave as None to keep the values from the source session.
    # We recommend setting the "openSimModel" to "LaiUhlrich2022_shoulder" and "coreengine" to "v1.0" for best results.
    # The "filterfrequency" setting can be set to an integer value in Hz to apply a low-pass Butterworth filter at that frequency.
    meta_overrides = {
        "openSimModel": "LaiUhlrich2022_shoulder",  # "LaiUhlrich2022_shoulder" | "LaiUhlrich2022"
        "scalingsetup": "upright_standing_pose",    # "upright_standing_pose" | "any_pose"
        "coreengine": "v1.0",                       # "v0.2" | "v0.3" | "v1.0"
        "filterfrequency": "default",               # "default" | <integer Hz>
    }

    # Trials to import. Setup trials (calibration, neutral) are always included.
    # Set to None to import all trials.
    trials_to_import = ["test"]

    # Optional per-trial overrides keyed by trial name.
    # Setting "activity_type" will auto-launch analysis after processing.
    trial_meta_overrides = {
        "test":     {"activity_type": ActivityType.range_of_motion},
    }

    mh_service = ModelHealthService(args["<api_key>"])
    session = copy_session(
        mh_service,
        session_id_input=args["<opencap_session_id>"],
        user_token_input=args["<opencap_token>"],
        meta_overrides=meta_overrides,
        trials_to_import=trials_to_import,
        trial_meta_overrides=trial_meta_overrides,
    )
    wait_for_activities(mh_service, session)
