@echo off
REM ModelHealth Documentation Viewer for Windows

echo ============================================================
echo ModelHealth SDK Documentation Server
echo ============================================================
echo.
echo Starting server at http://localhost:8080
echo.
echo Opening documentation in your browser...
echo.
echo Press Ctrl+C to stop the server when finished
echo ============================================================
echo.

cd /d "%~dp0"
start http://localhost:8080/documentation/modelhealth/
python view-docs.py

pause
