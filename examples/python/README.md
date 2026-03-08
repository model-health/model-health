# Model Health Python SDK Demo

An interactive CLI demo that walks through the post-capture analysis workflow:

1. Select a session
2. Select an activity from that session
3. Wait for processing to complete (if needed)
4. Choose an analysis type and run it
5. Save results to local files (metrics JSON, report PDF, and/or data ZIP)

Camera calibration, subject calibration and activity recording require the Model Health mobile app and are not demonstrated here.

## Requirements

- Python 3.11 or later
- `modelhealth` package: `pip install modelhealth`

## Run

```bash
python3 demo.py <api_key>
```
