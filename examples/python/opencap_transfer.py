import json
from urllib.parse import urlparse

from modelhealth import (
    ModelHealthService,
    SubjectParameters,
    SessionConfig,
    SessionOpenSimModel,
    SessionScalingSetup,
    SessionCoreEngine,
    FilterFrequencyDefault,
    FilterFrequencyHz,
    TransferStatusUploading,
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


def _short_id(uuid_str):
    """Return the first two dash-separated segments of a UUID."""
    parts = str(uuid_str).split("-")
    return "-".join(parts[:2]) if len(parts) > 2 else uuid_str


def copy_session(
    session_id_input,
    user_token_input,
    user_token_output,
    api_url_output="https://api.modelhealth.io/",
    api_url_input="https://api.opencap.ai/",
    meta_overrides=None,
):
    """Copy an OpenCap session into a ModelHealth account.

    Downloads all trials from the given OpenCap session and re-uploads them to
    a new ModelHealth session. Calibration and neutral trials are processed first
    and waited on before dynamic trials are submitted.

    Args:
        session_id_input: UUID of the OpenCap session to copy from.
        user_token_input: OpenCap authentication token.
        user_token_output: ModelHealth authentication token.
        api_url_output: Base URL of the ModelHealth API.
        api_url_input: Base URL of the OpenCap API.
        meta_overrides: Optional dict of settings to set under meta["settings"] on the new
            session, overriding or extending what is copied from the source session. Supported keys:
                - "openSimModel": "LaiUhlrich2022_shoulder" | "LaiUhlrich2022"
                - "scalingsetup": "upright_standing_pose" | "any_pose"
                - "coreengine": "v0.2" | "v0.3" | "v1.0"
                - "filterfrequency": "default" | <integer>
    """
    mh_service = ModelHealthService(user_token_output)

    # Fetch source session
    session_input = fetch_session(session_id_input, api_url=api_url_input, api_token=user_token_input)

    # Step 1: Create session
    session_output = mh_service.create_session()
    print(f"Created new session: {session_output.id}")

    # Step 2: Build session config from source settings, applying any overrides
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

    # Step 3: Select or create subject
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

    # Step 4: Resolve calibration — prefer parent session referenced in meta, fall back to current session
    calibration_trial = None
    calibration_source_session_id = None
    parent_calibration_id = (meta.get("sessionWithCalibration") or {}).get("id")

    if parent_calibration_id:
        try:
            parent_session = fetch_session(parent_calibration_id, api_url=api_url_input, api_token=user_token_input)
            cal = _pick_trial(parent_session["trials"], lambda n: n == "calibration")
            if cal is not None:
                calibration_trial = cal
                calibration_source_session_id = parent_calibration_id
                print(f"Using calibration from parent session {parent_calibration_id}.")
        except Exception as e:
            print(f"Could not load calibration from parent session: {e}")

    if calibration_trial is None:
        cal = _pick_trial(session_input["trials"], lambda n: n == "calibration")
        if cal is not None:
            calibration_trial = cal
            calibration_source_session_id = session_id_input

    # Build ordered trial list: calibration -> neutral -> dynamic
    neutral_trial = _pick_trial(session_input["trials"], lambda n: "neutral" in n)
    dynamic_trials = [
        t for t in session_input["trials"]
        if t["name"].lower() not in ("calibration", "neutral")
    ]
    ordered = []
    if calibration_trial is not None:
        ordered.append((calibration_trial, calibration_source_session_id))
    if neutral_trial is not None:
        ordered.append((neutral_trial, session_id_input))
    ordered.extend((t, session_id_input) for t in dynamic_trials)

    # Step 5: Transfer trials
    for trial, _source_session_id in ordered:
        trial_name = trial["name"]
        is_setup_trial = trial_name.lower() in ("calibration", "neutral")

        if is_setup_trial and trial.get("status") != "done":
            print(f"Trial '{trial_name}' is not done, skipping.")
            continue

        def on_status(status, _name=trial_name):
            if isinstance(status, TransferStatusUploading):
                print(f"  [{_name}] Uploading video {status.uploaded + 1}/{status.total}...")

        print(f"Transferring trial '{trial_name}'...")
        mh_service.transfer_trial(
            json.dumps(trial),
            subject,
            session=session_output,
            session_config=session_config,
            status_callback=on_status,
        )
        print(f"Trial '{trial_name}' transferred successfully.")


# %% User input
if __name__ == "__main__":
    session_id_input = "YOUR_OPENCAP_SESSION_ID"
    user_token_input = "YOUR_OPENCAP_TOKEN"

    user_token_output = "YOUR_MODELHEALTH_TOKEN"

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

    copy_session(
        session_id_input=session_id_input,
        user_token_input=user_token_input,
        user_token_output=user_token_output,

        meta_overrides=meta_overrides,
    )
