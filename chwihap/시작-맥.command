#!/bin/bash
# 업무망 취합도우미 실행 (맥). 파인더에서 더블클릭하세요.
cd "$(dirname "$0")"
if [ -x "./node/bin/node" ]; then
  ./node/bin/node server.js
elif command -v node >/dev/null 2>&1; then
  node server.js
else
  echo ""
  echo " [안내] Node.js 가 설치되어 있지 않습니다. README.md 의 '설치 준비'를 보세요."
  echo ""
  read -n 1 -s -r -p " 아무 키나 누르면 닫힙니다."
fi
