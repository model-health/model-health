# Model Health Python SDK Demo

An interactive CLI demo that walks through the post-capture analysis workflow:

1. Select a session
2. Select an activity from that session
3. Wait for processing to complete (if needed)
4. Choose an analysis type and run it
5. Save results to local files (metrics JSON, report PDF, and/or data ZIP)

Camera calibration, neutral pose capture, and activity recording require the Model Health mobile app and are not demonstrated here.

## Requirements

- Python 3.9 or later
- `modelhealth` package: `pip install modelhealth`

## Setup

Copy `.env.template` to `.env` and add your API key:

```bash
cp .env.template .env
# Edit .env and replace YOUR_API_KEY_HERE with your key
```

Or export it directly:

```bash
export MH_API_KEY=mh_your_api_key
```

## Run

```bash
python3 demo.py
```

If `MH_API_KEY` is not set the script will prompt for it on startup.
