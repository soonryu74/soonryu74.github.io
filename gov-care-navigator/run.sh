#!/bin/bash
# Mac / Linux 실행 스크립트 (run.bat과 동일 동작)
cd "$(dirname "$0")"
echo "[2026 공공 AI 대전환 챌린지] 국민 곁에 ON 구동 시작"
python3 -m pip install -r requirements.txt --quiet
python3 -m streamlit run app.py --server.port 8501
