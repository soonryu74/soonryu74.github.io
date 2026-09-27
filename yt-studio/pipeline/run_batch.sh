#!/bin/bash
# Mac·리눅스 예약 실행용. crontab 에서 이 파일을 부릅니다.
cd "$(dirname "$0")"
./.venv/bin/python studio.py batch topics.txt --limit 1 >> batch.log 2>&1
