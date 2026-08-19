@echo off
title Food Store - Setup One-Click
set "WT=%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe"
if exist "%WT%" (
    "%WT%" -w 0 powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-dev.ps1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-dev.ps1"
)
pause
