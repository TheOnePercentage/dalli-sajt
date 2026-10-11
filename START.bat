@echo off
chcp 65001 >nul
title DALLI E-commerce - Start Server
echo.
echo ========================================
echo   DALLI E-commerce - Lokalni Server
echo ========================================
echo.
echo Pokrecem server na http://localhost:3000 ...
echo.

cd /d "%~dp0"

REM Proveri da li je Python instaliran
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo GRESKA: Python nije instaliran!
    echo Instaliraj sa: https://python.org
    echo.
    pause
    exit /b 1
)

REM Otvori browser i pokreni server
start "" "http://localhost:3000"
python -m http.server 3000