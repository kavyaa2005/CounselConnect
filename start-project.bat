@echo off
REM -------------------------------------------------------------
REM  CounselConnect launcher
REM  Checks MongoDB is running, then opens the backend and the
REM  frontend in their own windows.
REM -------------------------------------------------------------
title CounselConnect launcher
cd /d "%~dp0"

echo.
echo  ================================================
echo    CounselConnect
echo  ================================================
echo.

REM -- 1. MongoDB --
echo  [1/3] Checking MongoDB...
sc query MongoDB 2>nul | find "RUNNING" >nul
if errorlevel 1 goto startmongo
echo        MongoDB is running.
goto backend

:startmongo
echo        Not running - trying to start it...
net start MongoDB >nul 2>&1
if errorlevel 1 goto mongofail
echo        Started.
goto backend

:mongofail
echo.
echo        Could not start MongoDB.
echo.
echo        Try one of these:
echo          - Right-click start-project.bat and pick "Run as administrator"
echo          - Or press Win+R, type services.msc, find "MongoDB Server",
echo            right-click it and choose Start
echo.
echo        If you continue now, the app will run on the JSON files
echo        instead and nothing will be saved to MongoDB.
echo.
choice /c YN /m "        Continue anyway"
if errorlevel 2 exit /b 1

:backend
echo.
echo  [2/3] Starting the backend...
start "CounselConnect API" /d "%~dp0backend" cmd /k npm run dev

REM Give the API a moment so the first page load has something to talk to.
timeout /t 4 /nobreak >nul

echo  [3/3] Starting the frontend...
start "CounselConnect Web" /d "%~dp0" cmd /k npm run dev

echo.
echo  ================================================
echo    Both started, each in its own window.
echo.
echo    Website : http://localhost:5173
echo    API     : http://localhost:5000/api/health
echo.
echo    IMPORTANT - look at the "CounselConnect API"
echo    window and find the line starting "Database :"
echo.
echo      Database : MongoDB      = saving to MongoDB
echo      Database : JSON files   = MongoDB is NOT running
echo.
echo    Leave both windows open. Ctrl+C in a window stops it.
echo.
echo    SENDING THIS PROJECT TO SOMEONE? Run this first:
echo      cd backend  ^&^&  npm run db:export
echo    Otherwise the zip carries stale data.
echo  ================================================
echo.
pause
