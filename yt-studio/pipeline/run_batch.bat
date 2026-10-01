@echo off
rem For Windows Task Scheduler
cd /d "%~dp0"
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
.venv\Scripts\python.exe studio.py batch topics.txt --limit 1 >> batch.log 2>&1
