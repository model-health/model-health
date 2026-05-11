# Model Health Python SDK — Examples

A collection of example scripts demonstrating the Model Health Python SDK.

## Requirements

- Python 3.11 or later
- `modelhealth` package: `pip install modelhealth`
- `docopt` package: `pip install docopt`
- `pandas` package: `pip install pandas` (required by `plot_kinematics.py`)
- `matplotlib` package: `pip install matplotlib` (required by `plot_kinematics.py`)

## Configuration

API credentials can be stored in a `.env` file in this directory so you don't
have to pass them on the command line every time.

Create a file called `.env` (it is gitignored):

```
MODEL_HEALTH_API_KEY=your_model_health_api_key
OPENCAP_TOKEN=your_opencap_token        # only needed for opencap_import.py
```

Each script reads credentials in this order:
1. Command-line argument (if provided)
2. `.env` file in this directory
3. Environment variable (`MODEL_HEALTH_API_KEY` / `OPENCAP_TOKEN`)

If `OPENCAP_TOKEN` is not found by any of the above, `opencap_import.py` will
prompt you to log in with your OpenCap
credentials and will save the token to `.env` automatically.

## Scripts

### `activity_analysis.py` — Post-capture analysis workflow

Walks through selecting a session and activity, running
an analysis and saving results (metrics JSON, report PDF, data ZIP).

```bash
python3 activity_analysis.py [<api_key>]
```

### `activity_recording.py` — Full capture workflow

Walks through creating a session, calibrating cameras and subject, recording an
activity and waiting for processing. Requires cameras connected via the [Model
Health companion iOS app](https://apps.apple.com/nl/app/model-health/id6748835391).

```bash
python3 activity_recording.py [<api_key>]
```

### `external_data.py` — Attach and download external files

Two subcommands for working with external files (e.g. sensor data CSVs,
audio recordings) attached to an activity.

**`upload`** — selects an activity in the `ready` state and attaches one or
more local files to it using `add_motion_data_to_activity`.

**`download`** — selects an activity and downloads a file that was previously
attached, identified by its tag string. Saves the raw bytes to the
`downloads/` directory.

> **Note:** activities that will receive external data must be recorded
> *without* an activity type. See the script's docstring for the correct
> workflow.

```bash
python3 external_data.py upload   [<api_key>]
python3 external_data.py download [<api_key>]
```

### `archive_session.py` — Session archive download

Requests preparation of a session archive and downloads the resulting ZIP file.

```bash
python3 archive_session.py [<api_key>]
```

### `session_data.py` — Download data from an existing session

Selects a session and activity interactively, then lets you download videos
(raw, synced), motion data (kinematics, markers) and analysis results
(metrics, report, data ZIP). Also downloads the OpenSim model from the
neutral activity if one is present in the session.

```bash
python3 session_data.py [<api_key>]
```

### `plot_kinematics.py` — Download and plot kinematics for an activity

Selects a session (your own or a built-in demo session), picks a single
activity, downloads its kinematics CSV and plots selected joint angle
columns against time.

```bash
python3 plot_kinematics.py [<api_key>]
```

### `opencap_import.py` — Import an OpenCap session

Copies data from an OpenCap session into a new Model Health session and processes them. The new session can be configured to leverage the latest settings (e.g. core engine v1.0) and activities are automatically analyzed when an activity type is set. See the example for details.

```bash
python3 opencap_import.py [--api-key=<key>] [--opencap-token=<token>] <opencap_session_id>
```
