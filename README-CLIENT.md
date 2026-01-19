# Model Health SDK Documentation

## Quick Start

1. Extract this archive
1. **Mac/Linux**: Run `python3 view-docs.py` in terminal
1. **Windows**: Double-click `view-docs.bat` (or run `python view-docs.py` in command prompt)
1. Your browser will open automatically showing the documentation
1. Press Ctrl+C in the terminal window to stop when finished

**Note**: Requires Python 3 (pre-installed on Mac/Linux, download from python.org for Windows)

## Alternative: Manual Web Server

If the scripts don't work, run this from the `sdk-docs` directory:

```bash
python3 -m http.server 8080
```

Then open: http://localhost:8080

## What's Inside

- **sdk-docs/** - Complete interactive HTML documentation
  - Browse API reference
  - Search functionality
  - Code examples
  - Type documentation

## Why a Web Server?

The documentation uses JavaScript for interactive features (search, navigation, syntax highlighting). Modern browsers restrict JavaScript when opening local HTML files directly for security reasons. A local web server provides the proper context.

## Questions?

Contact your Model Health SDK representative for support.
