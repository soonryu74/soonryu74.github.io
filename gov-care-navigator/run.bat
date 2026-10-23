@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo [2026 공공 AI 대전환 챌린지] 국민 곁에 ON 구동 시작
pip install -r requirements.txt --quiet
streamlit run app.py --server.port 8501
pause
