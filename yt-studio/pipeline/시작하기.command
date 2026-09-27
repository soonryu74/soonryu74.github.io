#!/bin/bash
# SaGA 영상 제작실 실행 (Mac) — 처음 한 번은 설치 때문에 5~10분 걸려요
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  echo "[처음 실행] 설치 중입니다. 5~10분 걸려요…"
  python3 -m venv .venv && .venv/bin/python -m pip install --upgrade pip && .venv/bin/python -m pip install -r requirements.txt
fi
[ -f config.json ] || cp config.example.json config.json
.venv/bin/python app.py
