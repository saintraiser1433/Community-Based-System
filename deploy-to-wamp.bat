@echo off
echo ========================================
echo   WAMP + Next.js Deployment Script
echo ========================================
echo.

REM Check if WAMP directory exists
if not exist "C:\wamp64\www" (
    echo ERROR: WAMP64 not found at C:\wamp64\www
    echo Please install WAMP64 or adjust the path in this script
    pause
    exit /b 1
)

echo [1/5] Building Next.js application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo [2/5] Creating WAMP directory structure...
if not exist "C:\wamp64\www\cbds" mkdir "C:\wamp64\www\cbds"
if not exist "C:\wamp64\www\cbds\.next" mkdir "C:\wamp64\www\cbds\.next"
if not exist "C:\wamp64\www\cbds\public" mkdir "C:\wamp64\www\cbds\public"
if not exist "C:\wamp64\www\cbds\prisma" mkdir "C:\wamp64\www\cbds\prisma"

echo [3/5] Copying application files...
xcopy /E /Y ".next\*" "C:\wamp64\www\cbds\.next\"
xcopy /E /Y "public\*" "C:\wamp64\www\cbds\public\"
xcopy /E /Y "prisma\*" "C:\wamp64\www\cbds\prisma\"
copy /Y "package.json" "C:\wamp64\www\cbds\"
copy /Y "next.config.ts" "C:\wamp64\www\cbds\"
copy /Y "tsconfig.json" "C:\wamp64\www\cbds\"

echo [4/5] Installing production dependencies...
cd "C:\wamp64\www\cbds"
call npm install --production
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [5/5] Setting up environment...
if not exist "C:\wamp64\www\cbds\.env.local" (
    echo Creating environment file...
    echo DATABASE_URL="file:./prisma/dev.db" > .env.local
    echo NEXTAUTH_URL="http://localhost:3000" >> .env.local
    echo NEXTAUTH_SECRET="your-secret-key-here-change-this-in-production" >> .env.local
    echo NEXT_PUBLIC_APP_NAME="MSWDO-GLAN Community Based Donation and Management System" >> .env.local
)

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your Next.js application has been deployed to WAMP.
echo.
echo Access URLs:
echo - Direct: http://localhost:3000
echo - Via WAMP: http://localhost/cbds (if Apache proxy is configured)
echo.
echo To start the application:
echo 1. Open Command Prompt as Administrator
echo 2. Navigate to: C:\wamp64\www\cbds
echo 3. Run: npm start
echo.
echo To configure Apache proxy, copy wamp-apache-config.conf
echo to C:\wamp64\bin\apache\apache2.4.x\conf\extra\
echo and include it in httpd.conf
echo.
pause


