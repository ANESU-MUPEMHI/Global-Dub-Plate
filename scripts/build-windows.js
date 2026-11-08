/**
 * Windows Portable Desktop Package Builder for Global Dub Plate
 * Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
 * 
 * Generates:
 * - dist/Global-Dub-Plate-Windows-Portable.zip
 * Containing:
 * - Launch-Global-Dub-Plate.bat (Double-click 1-click launcher for Windows 10 & 11)
 * - Launch-Global-Dub-Plate.ps1 (PowerShell launcher)
 * - server.js, package.json, public/, data/, electron/
 * - README-Windows.txt (Attribution & instructions)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function buildWindowsPackage() {
  console.log('=======================================================');
  console.log('🚀 Building Windows Desktop Package for Global Dub Plate...');
  console.log('Project: Global Dub Plate DAW (FL Studio Emulation)');
  console.log('Created by: Adrian Anesu Mupemhi');
  console.log('For: Jahvisions, Benjamin Music & Terence Taona Technologies');
  console.log('=======================================================\n');

  const rootDir = path.join(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const stagingDir = path.join(distDir, 'windows-staging');
  const appFolderName = 'Global Dub Plate';
  const appFolderPath = path.join(stagingDir, appFolderName);
  const zipPath = path.join(distDir, 'Global-Dub-Plate-Windows-Portable.zip');

  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(appFolderPath, { recursive: true });

  // 1. Create Launch-Global-Dub-Plate.bat
  console.log('⚡ Generating Launch-Global-Dub-Plate.bat...');
  const batScript = `@echo off
setlocal
title Global Dub Plate DAW - Windows Desktop Launcher
color 0b
echo ===============================================================================
echo   GLOBAL DUB PLATE DAW - DIGITAL AUDIO WORKSTATION (FL STUDIO EMULATION)
echo   Sound Clash Desk ^| Multitrack Arranger ^| Floating Mixer Console
echo   Created by Adrian Anesu Mupemhi
echo   For Jahvisions, Benjamin Music ^& Terence Taona Technologies
echo ===============================================================================
echo.

cd /d "%~dp0"
set PORT=3333
set URL=http://localhost:%PORT%

rem Verify Node.js is present
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo [ERROR] Node.js was not found in your system PATH.
  echo Please download and install Node.js (https://nodejs.org) to launch Global Dub Plate.
  echo.
  pause
  exit /b 1
)

echo [*] Starting Global Dub Plate Audio Engine on %URL%...
start /b "" node server.js > "%TEMP%\\global-dub-plate.log" 2>&1

echo [*] Initializing 6-Track Web Audio engine ^& Escrow gates...
timeout /t 2 /nobreak >nul

rem Find Edge or Chrome to launch in dedicated borderless 60fps app window mode
set BROWSER_BIN=
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
  set "BROWSER_BIN=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
) else if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
  set "BROWSER_BIN=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
) else if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
  set "BROWSER_BIN=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
) else if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
  set "BROWSER_BIN=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
) else if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
  set "BROWSER_BIN=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"
)

if defined BROWSER_BIN (
  echo [*] Launching Global Dub Plate in standalone borderless desktop window...
  start "" "%BROWSER_BIN%" --app="%URL%" --window-size=1360,860 --app-id="global-dub-plate-daw" --autoplay-policy=no-user-gesture-required
) else (
  echo [*] Opening default web browser...
  start %URL%
)

echo.
echo ===============================================================================
echo   Global Dub Plate is active! Keep this window open while using the DAW.
echo   Press Ctrl + C or close this window to stop the audio engine.
echo ===============================================================================
echo.
pause
`;
  fs.writeFileSync(path.join(appFolderPath, 'Launch-Global-Dub-Plate.bat'), batScript);

  // 2. Create Launch-Global-Dub-Plate.ps1
  console.log('⚡ Generating Launch-Global-Dub-Plate.ps1...');
  const psScript = `# Global Dub Plate - Windows PowerShell Desktop Launcher
# Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
$Port = 3333
$Url = "http://localhost:$Port"

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  GLOBAL DUB PLATE DAW - WINDOWS DESKTOP LAUNCHER" -ForegroundColor Yellow
Write-Host "  FL Studio Emulation | Floating Mixer | Multitrack Sound Clash Desk" -ForegroundColor Gray
Write-Host "===============================================================================" -ForegroundColor Cyan

# Test Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is required to run Global Dub Plate." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org" -ForegroundColor White
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "[*] Booting internal audio server..." -ForegroundColor Green
$ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
$ProcessInfo.FileName = "node"
$ProcessInfo.Arguments = "server.js"
$ProcessInfo.WorkingDirectory = $ScriptDir
$ProcessInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
[System.Diagnostics.Process]::Start($ProcessInfo) | Out-Null

Start-Sleep -Seconds 2

# Check for Edge or Chrome
$Edge = "\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe"
$Chrome = "\${env:ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe"


if (Test-Path $Edge) {
    Start-Process $Edge -ArgumentList "--app=$Url --window-size=1360,860 --autoplay-policy=no-user-gesture-required"
} elseif (Test-Path $Chrome) {
    Start-Process $Chrome -ArgumentList "--app=$Url --window-size=1360,860 --autoplay-policy=no-user-gesture-required"
} else {
    Start-Process $Url
}

Write-Host "[OK] Global Dub Plate is running at $Url" -ForegroundColor Green
`;
  fs.writeFileSync(path.join(appFolderPath, 'Launch-Global-Dub-Plate.ps1'), psScript);

  // 3. Write README-Windows.txt
  console.log('📝 Generating README-Windows.txt with attribution...');
  const readmeText = `================================================================================
GLOBAL DUB PLATE - WINDOWS DESKTOP EDITION
FL Studio Emulation • Multitrack Arranger • Floating Mixer • Sound Clash Desk
================================================================================

HOW TO RUN ON WINDOWS 10 & 11:
1. Extract all files from this ZIP package to any folder (e.g. C:\\GlobalDubPlate or Desktop).
2. Double-click "Launch-Global-Dub-Plate.bat" (or right-click Launch-Global-Dub-Plate.ps1 -> Run with PowerShell).
3. The Global Dub Plate audio engine will boot and immediately launch in a dedicated, 
   borderless 60fps hardware-accelerated DAW window!

KEYBOARD SHORTCUTS:
- F5       : Bring Out / Focus Playlist Arrangement
- F9       : Bring Out / Toggle Floating Mixer Window
- Space    : Start / Stop Playback
- Ctrl + M : Toggle Metronome Click
- Ctrl + P : Toggle 3-2-1 Countdown Pre-Count

REQUIREMENTS:
- Node.js (https://nodejs.org) - LTS version recommended.
- Microsoft Edge or Google Chrome (Pre-installed on Windows 10/11 for borderless DAW mode).

--------------------------------------------------------------------------------
PROJECT & CREATOR ATTRIBUTION:
This project was made by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies.
Owner: Adrian Anesu Mupemhi | Contact: +2772442 5958 | Address: 34 Derby Road, Kensington, Johannesburg, South Africa, 2094 | Email: mupemhianesu@gmail.com
--------------------------------------------------------------------------------
`;
  fs.writeFileSync(path.join(appFolderPath, 'README-Windows.txt'), readmeText);

  // 4. Copy app files
  console.log('📦 Bundling application files for Windows...');
  fs.copyFileSync(path.join(rootDir, 'server.js'), path.join(appFolderPath, 'server.js'));
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(appFolderPath, 'package.json'));
  if (fs.existsSync(path.join(rootDir, 'test-api.js'))) {
    fs.copyFileSync(path.join(rootDir, 'test-api.js'), path.join(appFolderPath, 'test-api.js'));
  }
  copyRecursiveSync(path.join(rootDir, 'public'), path.join(appFolderPath, 'public'));
  copyRecursiveSync(path.join(rootDir, 'data'), path.join(appFolderPath, 'data'));
  if (fs.existsSync(path.join(rootDir, 'electron'))) {
    copyRecursiveSync(path.join(rootDir, 'electron'), path.join(appFolderPath, 'electron'));
  }

  // 5. Create ZIP package
  console.log('🗜️ Compressing into Global-Dub-Plate-Windows-Portable.zip...');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const zipCmd = `/usr/bin/zip -r -q "${zipPath}" "${appFolderName}"`;
  execSync(zipCmd, { cwd: stagingDir, stdio: 'inherit' });

  // 6. Clean staging
  fs.rmSync(stagingDir, { recursive: true, force: true });

  const stats = fs.statSync(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n=======================================================');
  console.log(`🎉 WINDOWS DESKTOP PACKAGE COMPLETE!`);
  console.log(`📍 ZIP File: ${zipPath} (${sizeMB} MB)`);
  console.log('=======================================================');
}

if (require.main === module) {
  try {
    buildWindowsPackage();
  } catch (err) {
    console.error('❌ Windows package build failed:', err);
    process.exit(1);
  }
}

module.exports = { buildWindowsPackage };
