@echo off
chcp 65001 >nul
title DALLI - Python Server
echo.
echo ========================================
echo   DALLI E-commerce - Python Server
echo ========================================
echo.
echo Pokrecem server na http://localhost:3000 ...
echo.

cd /d "%~dp0"
start "" "http://localhost:3000"
python -m http.server 3000