@echo off
echo ========================================
echo   Starting MSWDO-GLAN CBDS on WAMP
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the WAMP deployment directory
    echo Expected location: C:\wamp64\www\cbds
    pause
    exit /b 1
)

REM Check if .next directory exists
if not exist ".next" (
    echo ERROR: .next directory not found
    echo Please run deploy-to-wamp.bat first to build and deploy the application
    pause
    exit /b 1
)

echo Starting Next.js application...
echo.
echo Application will be available at:
echo - http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the Next.js application
npm start


