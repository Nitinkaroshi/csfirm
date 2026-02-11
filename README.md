# CSFIRM - Company Secretary Firm Management Platform

A comprehensive multi-tenant SaaS platform designed specifically for Company Secretary (CS) firms to manage cases, clients, compliance deadlines, documents, and invoicing.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-18.x-green)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)

## 🌟 Features

### ✅ Phase 1 - Core Features (Completed)

#### 1. **Invoice Management System**
- Dynamic invoice editor with line items
- Auto-calculation of subtotals, tax, and totals
- Invoice lifecycle management (Draft → Issued → Paid)
- PDF generation and download
- Integration with payment gateway

#### 2. **Document Organization System**
- Hierarchical folder structure for document management
- Tag-based organization with color coding
- Document version tracking
- Secure vault for sensitive documents
- Support for multiple storage backends (Local, S3)

#### 3. **Compliance Deadline Tracker**
- Automated deadline status transitions
- MCA filing support with form type selector
- Configurable reminder system
- Dashboard with stats and filters
- Support for multiple compliance types (MCA, Tax, Annual Returns, etc.)

#### 4. **Client Portal**
- Role-based navigation (Staff vs Client views)
- Comprehensive dashboard with real-time statistics
- Recent cases, invoices, and compliance deadlines
- Overdue items tracking
- Responsive design

#### 5. **Razorpay Payment Gateway Integration**
- Secure payment processing
- Order creation and verification
- Webhook support for automated updates
- Payment tracking and history
- HTTP-only cookie-based security

### 🔐 Security Features

- **Multi-tenant Architecture** - Complete data isolation between firms
- **RBAC** - Role-Based Access Control with granular permissions
- **HTTP-only Cookies** - Secure authentication without XSS vulnerabilities
- **JWT with Refresh Tokens** - Automatic token rotation
- **Audit Logging** - Complete audit trail for all operations
- **Document Vault** - Encrypted storage for sensitive documents

### 📊 Additional Features

- **Case Management** - Complete case lifecycle tracking
- **Real-time Chat** - Socket.io-based messaging system
- **Notifications** - In-app and email notifications
- **Analytics Dashboard** - Business insights and metrics
- **Bulk Operations** - Batch processing for cases
- **Auto-assignment** - Intelligent case assignment algorithm

## 🏗️ Tech Stack

### Backend
- **Framework:** NestJS + Fastify
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Cache:** Redis
- **Queue:** BullMQ
- **Real-time:** Socket.io
- **Authentication:** JWT + Passport
- **Payments:** Razorpay

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **State Management:** Zustand + TanStack Query v5
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Forms:** React Hook Form

### DevOps
- **Monorepo:** Turborepo + npm workspaces
- **Containerization:** Docker + Docker Compose
- **Code Quality:** ESLint + Prettier

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **PostgreSQL** 14.x or higher
- **Redis** 6.x or higher

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Nitinkaroshi/csfirm.git
cd csfirm
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database
DATABASE_URL="postgresql://csfirm:csfirm_dev_pwd@localhost:5432/csfirm?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_DB=0

# API
API_PORT=3000
API_PREFIX="api"
NODE_ENV="development"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Razorpay (Get credentials from https://razorpay.com)
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_your_key_id"

# Email (Optional - for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@csfirm.local"

# S3 (Optional - for document storage)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="ap-south-1"
AWS_S3_BUCKET=""
```

### 4. Database Setup

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create user and database
CREATE USER csfirm WITH PASSWORD 'csfirm_dev_pwd';
CREATE DATABASE csfirm OWNER csfirm;
GRANT ALL PRIVILEGES ON DATABASE csfirm TO csfirm;

# Exit psql
\q
```

#### Run Migrations

```bash
cd prisma
npx prisma migrate deploy
npx prisma generate
```

#### Seed Database

```bash
npx ts-node prisma/seed.ts
```

### 5. Start Services

Make sure PostgreSQL and Redis are running:

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Check Redis
sudo systemctl status redis
```

### 6. Run the Application

**Development Mode:**

```bash
# Start all services (API + Frontend + Worker)
npm run dev

# Or start individually:
npm run dev:api      # API on http://localhost:3000
npm run dev:web      # Frontend on http://localhost:3001
npm run dev:worker   # Background worker
```

**Production Build:**

```bash
# Build all apps
npm run build

# Start production servers
npm run start
```

## 🔑 Demo Credentials

After seeding the database, you can use these credentials:

### Master Admin
- **Email:** admin@demo.csfirm.local
- **Password:** Admin@123456

### Manager
- **Email:** manager@demo.csfirm.local
- **Password:** Employee@123

### Employee
- **Email:** employee1@demo.csfirm.local
- **Password:** Employee@123

### Client
- **Email:** client@acme.com
- **Password:** Client@123

## 📁 Project Structure

```
csfirm/
├── apps/
│   ├── api/                    # NestJS backend application
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   ├── common/         # Shared utilities
│   │   │   ├── config/         # Configuration files
│   │   │   └── database/       # Database setup
│   │   └── package.json
│   │
│   ├── web/                    # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/           # Next.js app directory
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── lib/           # Utilities
│   │   │   └── stores/        # State management
│   │   └── package.json
│   │
│   └── worker/                 # Background job processor
│       ├── src/
│       │   └── processors/     # Job processors
│       └── package.json
│
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Database seeding script
│
├── packages/
│   ├── shared-types/          # Shared TypeScript types
│   └── eslint-config/         # Shared ESLint config
│
├── docs/
│   └── architecture/          # Architecture documentation
│
├── docker/                    # Docker configurations
├── .env                       # Environment variables
├── package.json               # Root package.json
├── turbo.json                 # Turborepo configuration
└── README.md                  # This file
```

## 🌐 API Documentation

Once the API is running, you can access:

- **Swagger UI:** http://localhost:3000/api/docs
- **API Base URL:** http://localhost:3000/api

### Key API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

#### Cases
- `GET /api/cases` - List all cases
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get case details
- `PATCH /api/cases/:id/status` - Update case status
- `POST /api/cases/:id/assign` - Assign case to employee

#### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details
- `PATCH /api/organizations/:id` - Update organization

#### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/issue` - Issue invoice
- `GET /api/invoices/:id/pdf` - Download invoice PDF

#### Payments
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment
- `GET /api/payment/status/:invoiceId` - Get payment status

#### Compliance
- `GET /api/compliance/deadlines` - List deadlines
- `POST /api/compliance/deadlines` - Create deadline
- `POST /api/compliance/deadlines/:id/complete` - Mark as complete

## 🔧 Configuration

### Razorpay Setup

1. Create a Razorpay account at https://razorpay.com
2. Get your API keys from the dashboard
3. For testing, use Test Mode keys (prefix: `rzp_test_`)
4. For production, use Live Mode keys (prefix: `rzp_live_`)
5. Set up webhooks:
   - Webhook URL: `https://your-domain.com/api/payment/webhook`
   - Events: `payment.captured`, `payment.failed`

### Email Setup (Optional)

For Gmail:
1. Enable 2-Factor Authentication
2. Generate an App Password
3. Use the App Password in `SMTP_PASS`

### S3 Storage (Optional)

1. Create an S3 bucket in AWS
2. Create an IAM user with S3 access
3. Configure credentials in `.env`

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## 📦 Deployment

### Using Docker

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment

1. **Build the applications:**
   ```bash
   npm run build
   ```

2. **Set environment variables** for production

3. **Run database migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the services:**
   ```bash
   npm run start:prod
   ```

### Environment-specific Considerations

- Set `NODE_ENV=production`
- Use strong JWT secrets
- Enable HTTPS
- Configure CORS properly
- Set up proper logging
- Configure database backups
- Use Redis for session storage
- Set up monitoring (PM2, New Relic, etc.)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Database Schema

The application uses PostgreSQL with Prisma ORM. Key models include:

- **Firm** - Multi-tenant isolation
- **User** - Staff and client users
- **Organization** - Client companies
- **Case** - Service cases
- **Invoice** - Billing and payments
- **ComplianceDeadline** - Deadline tracking
- **CaseDocument** - Document management
- **ChatRoom** - Real-time messaging
- **Notification** - User notifications
- **AuditLog** - Audit trail

For detailed schema, see [prisma/schema.prisma](prisma/schema.prisma)

## 🐛 Known Issues

- Document upload size limit: 10MB (configurable)
- Real-time notifications require WebSocket connection
- PDF generation uses Puppeteer (ensure sufficient memory)

## 🗺️ Roadmap

### Phase 2 (Planned)
- [ ] Advanced reporting and analytics
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Advanced RBAC with custom roles
- [ ] Integration with MCA portal
- [ ] Automated compliance reminders
- [ ] Client self-service portal enhancements

### Phase 3 (Future)
- [ ] AI-powered case insights
- [ ] OCR for document processing
- [ ] Advanced workflow automation
- [ ] Third-party integrations (Tally, Zoho, etc.)
- [ ] White-label solution

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **CSFIRM Team**
- Built with assistance from Claude Sonnet 4.5

## 🙏 Acknowledgments

- NestJS team for the excellent framework
- Next.js team for the amazing React framework
- Prisma team for the best ORM
- All open-source contributors

## 📞 Support

For support, email support@csfirm.local or open an issue in the GitHub repository.

## 🔗 Links

- **Repository:** https://github.com/Nitinkaroshi/csfirm
- **Documentation:** See `/docs` directory
- **Issues:** https://github.com/Nitinkaroshi/csfirm/issues

---

**Built with ❤️ for Company Secretary firms worldwide**
