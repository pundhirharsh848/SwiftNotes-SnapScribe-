@echo off
echo ========================================================
echo   Starting SwiftNotes AI Backend Server (FastAPI)
echo ========================================================
cd /d "%~dp0server"
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
