"""Shared utilities for Model Health example scripts."""

import os

# All example scripts save their output here.
DOWNLOADS_DIR = os.path.join(os.path.dirname(__file__), "downloads")

# File extensions for motion data types (keyed by MotionData.type string).
MOTION_DATA_EXT = {
    "animation":      "json",
    "kinematics_mot": "mot",
    "kinematics_csv": "csv",
    "markers_trc":    "trc",
    "markers_csv":    "csv",
    "model":          "osim",
}

# File extensions for analysis data types (keyed by AnalysisData.type string).
ANALYSIS_DATA_EXT = {
    "metrics": "json",
    "report":  "pdf",
    "data":    "zip",
}


def save_file(filename, data):
    """Save bytes to the downloads directory.

    Creates the downloads directory if it does not exist.

    Args:
        filename: Filename (not a full path) to write inside the downloads directory.
        data: Raw bytes to write.

    Returns:
        The full path of the saved file.
    """
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    path = os.path.join(DOWNLOADS_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)
    return path
