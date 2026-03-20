# Model Health Python SDK — Examples

A collection of example scripts demonstrating the Model Health Python SDK.

## Requirements

- Python 3.11 or later
- `modelhealth` package: `pip install modelhealth`
- `docopt` package: `pip install docopt`

## Scripts

### `activity_analysis.py` — Post-capture analysis workflow

Walks through selecting a session and activity, waiting for processing, running
an analysis and saving results (metrics JSON, report PDF, data ZIP).

```bash
python3 activity_analysis.py <api_key>
```

### `activity_recording.py` — Full capture workflow

Walks through creating a session, calibrating cameras and subject, recording an
activity and waiting for processing. Requires cameras connected via the Model
Health mobile app.

```bash
python3 activity_recording.py <api_key>
```

### `archive_session.py` — Session archive download

Requests preparation of a session archive and downloads the resulting ZIP file.

```bash
python3 archive_session.py <api_key>
```

### `session_data.py` — Download data from an existing session

Downloads motion data, analysis results and archives for a specific session.

```bash
python3 session_data.py <api_key> <session_id>
```

### `opencap_import.py` — Import an OpenCap session

Copies all activities from an OpenCap session into a new Model Health session and processes them.

```bash
python3 opencap_import.py <api_key> <opencap_token> <opencap_session_id>
```
