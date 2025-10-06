@echo off
echo 🚀 Setting up Community Based Donation System Database...

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found. Please create one first.
    echo Copy .env.example to .env and update the database URL.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
npm install

echo 🔧 Generating Prisma client...
npm run db:generate

echo 🗄️ Pushing database schema...
npm run db:push

echo 🌱 Seeding database with sample data...
npm run db:seed

echo ✅ Database setup complete!
echo.
echo 🎉 You can now start the development server:
echo    npm run dev
echo.
echo 📋 Test accounts available:
echo    Admin: admin@cbds.com / admin123
echo    Barangay: manager1@cbds.com / manager123
echo    Resident: resident1@cbds.com / resident123
echo.
echo 🌐 Open http://localhost:3000 to view the application
pause
