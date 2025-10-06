# MSWDO-GLAN Community Based Donation and Management System

A comprehensive platform for managing community donations and distributions for the Municipality of Glan, Sarangani Province. Built with Next.js, ShadCN UI, and Prisma.

## Features

### 🏠 Guest Users (Landing Page)
- Public landing page with program information
- Frequently Asked Questions (FAQ) section
- Contact details and registration options
- Beautiful, responsive design with friendly icons

### 👥 Residents
- User registration and authentication
- Family member management
- View donation schedules per barangay
- One-time claim restriction to prevent multiple claims
- Transparent donation tracking

### 🏘️ Barangay Panel
- Manage and publish distribution schedules
- Audit trail verification for every claim
- Generate analytical reports for donations distributed
- Real-time tracking of resident claims

### 🛡️ Social Welfare Office (Admin Panel)
- Manage user accounts (residents, barangay managers)
- System role management
- Generate and print donation reports
- Access comprehensive data analytics
- System oversight and monitoring

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **UI Components**: ShadCN UI with Radix UI primitives
- **Icons**: Lucide React with cute, friendly theme
- **Backend**: Prisma ORM with PostgreSQL
- **Authentication**: NextAuth.js with role-based access
- **Styling**: Tailwind CSS
- **Reports**: PDF/Excel export functionality

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cbds
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/cbds_db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed the database with sample data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Test Accounts

After seeding the database, you can use these test accounts:

### Admin Account
- **Email**: admin@cbds.com
- **Password**: admin123
- **Access**: Full system administration

### Barangay Manager Accounts
- **Email**: manager1@cbds.com
- **Password**: manager123
- **Access**: Barangay San Antonio management

- **Email**: manager2@cbds.com
- **Password**: manager123
- **Access**: Barangay San Jose management

### Resident Accounts
- **Email**: resident1@cbds.com
- **Password**: resident123
- **Access**: Resident dashboard for Barangay San Antonio

- **Email**: resident2@cbds.com
- **Password**: resident123
- **Access**: Resident dashboard for Barangay San Antonio

- **Email**: resident3@cbds.com
- **Password**: resident123
- **Access**: Resident dashboard for Barangay San Jose

## Project Structure

```
cbds/
├── src/
│   ├── app/
│   │   ├── admin/           # Admin dashboard
│   │   ├── barangay/        # Barangay management
│   │   ├── resident/        # Resident dashboard
│   │   ├── auth/            # Authentication pages
│   │   └── api/             # API routes
│   ├── components/
│   │   ├── ui/              # ShadCN UI components
│   │   └── providers/       # Context providers
│   ├── lib/                 # Utilities and configurations
│   └── types/               # TypeScript type definitions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts             # Database seeder
└── public/                  # Static assets
```

## Key Features Implementation

### 🔐 Authentication & Authorization
- Role-based access control (Resident, Barangay, Admin)
- Secure password hashing with bcrypt
- Session management with NextAuth.js
- Protected routes with middleware

### 📊 Database Design
- Comprehensive schema with relationships
- Audit trails for transparency
- One-time claim restrictions
- Family management system

### 🎨 User Interface
- Modern, responsive design
- Cute and friendly icons from Lucide React
- Consistent color scheme and branding
- Mobile-first approach

### 📈 Analytics & Reporting
- Real-time dashboard statistics
- Barangay performance metrics
- Donation distribution analytics
- Export functionality (PDF/Excel)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints

### Resident APIs
- `GET /api/resident/schedules` - Get donation schedules
- `GET /api/resident/family` - Get family information
- `GET /api/resident/claims` - Get user claims
- `POST /api/resident/claim` - Claim a donation

### Barangay APIs
- `GET /api/barangay/schedules` - Manage schedules
- `GET /api/barangay/claims` - View claims
- `GET /api/barangay/residents` - View residents
- `POST /api/barangay/schedules` - Create schedule

### Admin APIs
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/activity` - Recent activity
- `GET /api/admin/barangay-stats` - Barangay performance

## Database Schema

The system uses a comprehensive database schema with the following main entities:

- **Users**: System users with role-based access
- **Barangays**: Community divisions
- **Families**: Family units with members
- **DonationSchedules**: Distribution schedules
- **Claims**: Donation claims with audit trails
- **AuditLogs**: System activity tracking
- **FAQs**: Frequently asked questions
- **ContactInfo**: Contact information

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact:
- Email: info@cbds.com
- Phone: +63-2-123-4567
- Address: 123 Community Center, City Hall, Metro Manila

---

Built with ❤️ for the community