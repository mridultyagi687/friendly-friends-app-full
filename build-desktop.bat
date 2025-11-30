@echo off
REM Build script for Windows desktop application (.exe)

echo 🚀 Building Friendly Friends Desktop Application
echo ================================================

REM Step 1: Build frontend
echo.
echo Step 1: Building frontend...
cd frontend
call npm install
call npm run build
cd ..

REM Step 2: Build backend executable
echo.
echo Step 2: Building backend executable...
cd backend
python build_exe.py
cd ..

REM Step 3: Build Electron app
echo.
echo Step 3: Building Electron desktop app...
cd electron
call npm install
call npm run build:win
cd ..

echo.
echo ✅ Build complete!
echo Check the 'electron\dist-electron' directory for the built application.
pause

