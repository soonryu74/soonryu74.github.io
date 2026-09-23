@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 업무망 취합도우미
if exist "node\node.exe" (
  "node\node.exe" server.js
  goto end
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [안내] Node.js 가 설치되어 있지 않습니다.
  echo  README.md 의 "설치 준비" 를 보고 Node.js 를 설치하거나,
  echo  이 폴더 안에 node 폴더를 만들고 node.exe 를 넣어 주세요.
  echo.
  pause
  exit /b 1
)
node server.js
:end
pause
