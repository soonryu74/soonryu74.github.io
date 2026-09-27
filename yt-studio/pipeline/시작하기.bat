@echo off
rem SaGA video studio launcher (Windows)
cd /d "%~dp0"
chcp 65001 > nul
if not exist .venv\Scripts\python.exe (
  echo [First run] Installing. This takes 5-10 minutes...
  py -m venv .venv 2>nul || python -m venv .venv
  .venv\Scripts\python.exe -m pip install --upgrade pip
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)
if not exist config.json copy config.example.json config.json > nul
.venv\Scripts\python.exe app.py
pause
