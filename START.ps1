<# 
DALLI - PowerShell Launcher
Desni klik -> "Run with PowerShell"
#>

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DALLI E-commerce - Lokalni Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $projectPath

Write-Host "Pokrecem server na http://localhost:3000 ..." -ForegroundColor Yellow
Write-Host ""

# Proveri Python
try {
    $pythonVersion = python --version 2>$null
    if (-not $pythonVersion) { throw "Python nije pronadjen" }
    Write-Host "Python verzija: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "GRESKA: Python nije instaliran!" -ForegroundColor Red
    Write-Host "Instaliraj sa: https://python.org" -ForegroundColor Red
    Read-Host "Pritisni Enter za izlaz"
    exit 1
}

# Otvori browser
Start-Process "http://localhost:3000"

# Pokreni server
Write-Host "Server pokrenut. Pritisni Ctrl+C za zaustavljanje." -ForegroundColor Green
Write-Host ""
python -m http.server 3000