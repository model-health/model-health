#!/usr/bin/env python3
"""
Model Health Documentation Viewer

Double-click this file to start a local web server and view the documentation.
Press Ctrl+C in the terminal to stop the server.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

# Change to the directory containing this script
os.chdir(Path(__file__).parent)

PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler

print("=" * 60)
print("Model Health SDK Documentation Server")
print("=" * 60)
print(f"\nStarting server at http://localhost:{PORT}")
print("\nOpening documentation in your browser...")
print("\nPress Ctrl+C to stop the server when finished")
print("=" * 60)

# Open browser to the documentation path, not index.html
webbrowser.open(f'http://localhost:{PORT}/documentation/modelhealth/')

# Start server
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down server...")
        sys.exit(0)
