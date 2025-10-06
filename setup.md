# Quick Setup Guide

## 1. Database Setup

### Option A: Using Docker (Recommended)
```bash
# Start PostgreSQL with Docker
docker run --name cbds-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=cbds_db -p 5432:5432 -d postgres:15

# Update .env file
DATABASE_URL="postgresql://postgres:password@localhost:5432/cbds_db"
```

### Option B: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database named `cbds_db`
3. Update the `.env` file with your credentials

## 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cbds_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-this-in-production"

# App Configuration
NEXT_PUBLIC_APP_NAME="Community Based Donation System"
NEXT_PUBLIC_APP_DESCRIPTION="A comprehensive donation management system for communities"
```

## 3. Install and Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with sample data
npm run db:seed

# Start development server
npm run dev
```

## 4. Access the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. Use the test accounts from the README
3. Explore the different user roles and features

## 5. Test the System

### As a Resident:
1. Sign in with `resident1@cbds.com` / `resident123`
2. View donation schedules
3. Claim donations
4. Manage family members

### As a Barangay Manager:
1. Sign in with `manager1@cbds.com` / `manager123`
2. Create donation schedules
3. View and verify claims
4. Monitor residents

### As an Admin:
1. Sign in with `admin@cbds.com` / `admin123`
2. View system analytics
3. Monitor all activities
4. Generate reports

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check your DATABASE_URL in .env
- Verify database credentials

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run lint`

### Authentication Issues
- Ensure NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your development URL

## Production Deployment

1. Set up a production PostgreSQL database
2. Update environment variables for production
3. Run `npm run build`
4. Deploy to your preferred platform (Vercel, Netlify, etc.)

## Features to Test

- ✅ User registration and authentication
- ✅ Role-based dashboard access
- ✅ Donation schedule management
- ✅ One-time claim restrictions
- ✅ Family member management
- ✅ Audit trail tracking
- ✅ Analytics and reporting
- ✅ Responsive design
- ✅ Beautiful UI with cute icons
