# Karyantrix

> A full-stack service marketplace platform that connects customers with service providers, supports service listings, requirements, bidding, bookings, payments, real-time messaging, provider onboarding, reviews, notifications, support, reporting, wallets, and administration.

## Overview

Karyantrix is a production-oriented service marketplace application with separate **Next.js frontend** and **Node.js/Express backend** applications.

The platform supports two primary marketplace roles:

- **Customer** – discovers services/providers, posts requirements, communicates with providers, books services, makes advance/balance payments, reviews completed work, and raises support/report requests.
- **Provider** – creates and manages service listings, applies to become a provider, manages a provider profile, responds to customer requirements, works on bookings, uploads progress, and manages earnings/wallet information.
- **Admin** – manages users, providers, applications, categories, service catalog, requirements, reports, cancellations, support tickets, analytics, wallet operations, payouts, refunds, and platform settings.

The backend also provides REST APIs, Swagger documentation, JWT-based authentication, Google authentication, OTP workflows, Razorpay payment integration, file uploads, security middleware, and Socket.IO-powered real-time communication.

---

## Key Features

### Authentication & Account Management

- Customer/provider registration with OTP verification
- OTP resend functionality
- Password-based login
- OTP-based login
- Google authentication
- Forgot-password flow
- Reset-password OTP verification
- Change password
- JWT authentication
- Refresh-token flow
- Logout
- Protected routes and role-based authorization
- Profile management
- Profile avatar upload/removal
- Contact information update with OTP verification
- Rate limiting for authentication endpoints

### Service Marketplace

- Browse service listings
- View individual service details
- Create service listings
- Bulk-create services
- Edit and delete own listings
- Browse service providers
- View provider profiles
- Category-based service discovery
- Service catalog management
- Provider-specific listings

### Customer Requirements & Bidding

- Customers can create requirements
- Providers can discover requirements
- Providers can submit bids
- Customers can review/select bids
- Requirement management and status tracking
- Requirement attachments/uploads
- Admin requirement monitoring

### Booking & Work Management

- Create/manage bookings
- View personal bookings
- Booking details
- Advance-payment order creation
- Advance-payment verification
- Provider work-progress updates
- Upload progress media
- Customer response to progress updates
- Provider can mark work as completed
- Balance-payment order creation
- Balance-payment verification
- Booking cancellation workflow

### Payments

- Razorpay integration
- Advance payment support
- Balance payment support
- Payment verification
- Provider earnings
- Provider wallet
- Admin wallet management
- Pending dues
- Pending payouts
- Payout creation
- Refund management
- Transaction resolution
- Wallet history
- Wallet analytics
- Configurable booking advance percentage

### Real-Time Communication

- Customer/provider conversations
- Conversation list
- Message history
- Send messages
- Edit messages
- Delete messages
- Mark conversations as read
- Real-time Socket.IO communication
- Chat file uploads
- Chunked file-upload workflow for larger files

### Reviews & Notifications

- Customer reviews
- Ratings
- Review management
- In-app notifications
- Notification listing and management

### Provider Onboarding

- Become-provider workflow
- Provider application
- Multi-step application saving
- Application submission
- Provider profile management
- Certifications
- Portfolio support
- Admin application review/approval

### Reports & Support

- Report marketplace/users/content
- Admin report review
- Report resolution
- Customer/provider support tickets
- Ticket messages
- Admin support-ticket management
- Ticket status updates

### Admin Panel

The project contains a dedicated admin area with:

- Dashboard
- User management
- User activation/deactivation
- Provider approval
- Provider application review
- Requirements monitoring
- Cancellation management
- Cancellation analytics
- Reports
- Report resolution
- Platform analytics
- Category management
- Service catalog management
- Wallet settings
- Wallet summary
- Customer receipts
- Pending dues
- Pending payouts
- Payout processing
- Refund processing
- Transaction resolution
- Wallet history
- Wallet analytics
- Support-ticket management

### PWA & Frontend UX

The frontend includes:

- Next.js App Router
- Responsive UI
- Tailwind CSS
- Framer Motion animations
- Reusable UI components
- Loading/skeleton states
- Toast notifications
- Protected routes
- PWA manifest
- Service worker
- Offline page
- SEO-related robots and sitemap configuration
- JSON-LD support

---

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| Next.js 14 | React framework and routing |
| React 18 | UI development |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Axios | HTTP API communication |
| Socket.IO Client | Real-time communication |
| Lucide React | Icons |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | REST API framework |
| MongoDB | Database |
| Mongoose | MongoDB ODM |
| Socket.IO | Real-time communication |
| JWT | Authentication |
| Google Auth Library | Google authentication |
| Razorpay | Payments |
| Nodemailer | Email delivery |
| Twilio | SMS/OTP delivery |
| Multer | File uploads |
| Swagger UI Express | API documentation |

### Security & Infrastructure

- Helmet
- CORS
- Express Rate Limit
- HPP
- MongoDB sanitization middleware
- Cookie Parser
- Compression
- Environment-based configuration
- Role-based authorization
- Protected API routes

### Testing

- Jest
- Supertest
- MongoDB Memory Server
- Authentication tests
- Category tests
- Requirement tests

---

## Project Structure

```text
Karyantrix/
│
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   ├── razorpay.js
│   │   └── swagger.js
│   │
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── analyticsController.js
│   │   ├── authController.js
│   │   ├── bidController.js
│   │   ├── bookingController.js
│   │   ├── categoryController.js
│   │   ├── chatController.js
│   │   ├── chatUploadController.js
│   │   ├── notificationController.js
│   │   ├── providerController.js
│   │   ├── reportController.js
│   │   ├── requirementController.js
│   │   ├── reviewController.js
│   │   ├── serviceCatalogController.js
│   │   ├── serviceController.js
│   │   ├── supportController.js
│   │   ├── uploadController.js
│   │   └── walletController.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── rateLimit.js
│   │   └── upload.js
│   │
│   ├── models/
│   │   ├── Bid.js
│   │   ├── Booking.js
│   │   ├── Category.js
│   │   ├── Conversation.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── Otp.js
│   │   ├── PendingUser.js
│   │   ├── PlatformSetting.js
│   │   ├── ProviderProfile.js
│   │   ├── Report.js
│   │   ├── Requirement.js
│   │   ├── Review.js
│   │   ├── Service.js
│   │   ├── ServiceCatalog.js
│   │   ├── SupportTicket.js
│   │   ├── UploadSession.js
│   │   ├── User.js
│   │   └── WalletTransaction.js
│   │
│   ├── routes/
│   ├── scripts/
│   ├── sockets/
│   ├── tests/
│   ├── utils/
│   ├── uploads/
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── app/
    │   ├── admin/
    │   ├── become-provider/
    │   ├── bookings/
    │   ├── categories/
    │   ├── forgot-password/
    │   ├── login/
    │   ├── messages/
    │   ├── notifications/
    │   ├── profile/
    │   ├── provider/
    │   ├── providers/
    │   ├── register/
    │   ├── services/
    │   └── support/
    │
    ├── components/
    ├── context/
    ├── lib/
    ├── public/
    ├── package.json
    └── next.config.js
```

---

## Prerequisites

Make sure the following are installed:

- Node.js 18+ recommended
- npm
- MongoDB
- Git

For production integrations, you will also need credentials for the services you enable:

- Google OAuth
- SMTP/email provider
- Twilio
- Razorpay

---

## Installation

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Karyantrix
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

Open another terminal:

```bash
cd frontend
npm install
```

---

## Environment Variables

### Backend

Create:

```text
backend/.env
```

Use the following variables as a template:

```env
PORT=5000
NODE_ENV=development

CLIENT_URL=http://localhost:5175

MONGO_URI=mongodb://127.0.0.1:27017/karyantrix

JWT_SECRET=replace_with_a_strong_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_MS=604800000

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_SENDER_USER=
SMTP_PASSWORD=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

GOOGLE_CLIENT_ID=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

BOOKING_ADVANCE_PERCENT=20
```

> Never commit real secrets, API keys, passwords, JWT secrets, or payment credentials to GitHub.

### Frontend

Create:

```text
frontend/.env.local
```

Example:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:5175
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Use the actual backend URL when deploying the frontend.

---

## Running the Application

### Start the backend

```bash
cd backend
npm run dev
```

Production-style start:

```bash
npm start
```

The backend defaults to:

```text
http://localhost:5000
```

Health check:

```text
GET /api/health
```

### Start the frontend

```bash
cd frontend
npm run dev
```

The frontend is configured to run on:

```text
http://localhost:5175
```

---

## API Documentation

Swagger documentation is available from the backend at:

```text
http://localhost:5000/api-docs
```

Swagger JSON:

```text
http://localhost:5000/api-docs.json
```

---

## Main API Modules

The backend exposes the following API groups:

| Module | Base Route |
|---|---|
| Authentication | `/api/auth` |
| Categories | `/api/categories` |
| Service Catalog | `/api/service-catalog` |
| Services | `/api/services` |
| Reviews | `/api/reviews` |
| Requirements | `/api/requirements` |
| Providers | `/api/providers` |
| Notifications | `/api/notifications` |
| Admin | `/api/admin` |
| Uploads | `/api/uploads` |
| Chat | `/api/chats` |
| Reports | `/api/reports` |
| Bookings | `/api/bookings` |
| Support | `/api/support` |

---

## Authentication Flow

Karyantrix supports multiple authentication mechanisms.

### Registration

```text
Register
   ↓
OTP sent
   ↓
OTP verification
   ↓
Account created
   ↓
Authentication tokens
```

### Login

Users can authenticate using:

- Email/password
- OTP
- Google authentication

### Token Flow

```text
Client
  ↓
Access Token
  ↓
Protected API
  ↓
Token expires
  ↓
Refresh Token
  ↓
New Access Token
```

---

## Marketplace Flow

A typical customer/provider workflow is:

```text
Customer
   │
   ├── Browse Categories
   │
   ├── Browse Services / Providers
   │
   ├── Create Requirement
   │
   └── Receive Provider Bids
             │
             ▼
       Select Provider
             │
             ▼
          Booking
             │
       ┌─────┴─────┐
       ▼           ▼
 Advance Payment   Work Progress
       │           │
       └─────┬─────┘
             ▼
        Work Completed
             │
             ▼
        Balance Payment
             │
             ▼
           Review
```

---

## Provider Workflow

```text
User
  ↓
Become a Provider
  ↓
Complete Application
  ↓
Submit Application
  ↓
Admin Review
  ↓
Provider Approved
  ↓
Create Profile / Services
  ↓
Receive Requirements
  ↓
Submit Bids
  ↓
Booking
  ↓
Deliver Work
  ↓
Receive Earnings
```

---

## Payment Flow

The booking system supports an advance + balance payment model.

```text
Booking
   ↓
Advance Order
   ↓
Razorpay Payment
   ↓
Payment Verification
   ↓
Provider Starts Work
   ↓
Work Progress
   ↓
Work Completed
   ↓
Balance Order
   ↓
Razorpay Payment
   ↓
Balance Verification
   ↓
Booking Completed
```

The advance percentage can be configured using:

```env
BOOKING_ADVANCE_PERCENT=20
```

---

## Real-Time Chat

Socket.IO is used for real-time communication between customers and providers.

Chat supports:

- Conversations
- Messages
- Message editing
- Message deletion
- Read status
- Real-time updates
- File uploads
- Chunked uploads

The backend initializes Socket.IO alongside the Express HTTP server.

---

## File Uploads

The backend provides upload support for:

- User avatars
- Requirements
- Booking progress media
- Chat attachments

Uploads are handled through Multer and the backend exposes uploaded files under:

```text
/uploads
```

For production, consider moving uploaded media to object storage such as Amazon S3, Cloudflare R2, or another managed storage provider.

---

## Database

The current implementation uses:

```text
MongoDB + Mongoose
```

Important data models include:

- User
- ProviderProfile
- Service
- ServiceCatalog
- Category
- Requirement
- Bid
- Booking
- Review
- Conversation
- Message
- Notification
- WalletTransaction
- Report
- SupportTicket
- UploadSession
- PlatformSetting
- OTP-related models

---

## Testing

Backend tests are configured with Jest.

Run:

```bash
cd backend
npm test
```

The repository contains tests covering areas including:

- Authentication
- Categories
- Requirements

Tests use Supertest and MongoDB Memory Server where applicable.

---

## Production Deployment

The project is structured so the frontend and backend can be deployed separately.

### Frontend

Build:

```bash
cd frontend
npm run build
```

Start:

```bash
npm start
```

Recommended hosting options include any platform that supports Next.js/Node.js.

### Backend

Build/install dependencies:

```bash
cd backend
npm install
```

Start:

```bash
npm start
```

The backend listens on:

```text
0.0.0.0
```

and uses the `PORT` environment variable.

### Production URL Configuration

If the frontend and backend are deployed separately:

```text
Frontend:
https://your-frontend-domain.com

Backend:
https://your-api-domain.com
```

Set the frontend API URL to the deployed backend:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

Set the backend client URL to the deployed frontend:

```env
CLIENT_URL=https://your-frontend-domain.com
```

If multiple frontend origins are required, `CLIENT_URL` can contain comma-separated allowed origins according to the backend configuration.

---

## Security Checklist

Before production deployment:

- [ ] Replace all development secrets
- [ ] Use a strong `JWT_SECRET`
- [ ] Use production MongoDB credentials
- [ ] Configure HTTPS
- [ ] Configure production CORS origins
- [ ] Configure Google OAuth production credentials
- [ ] Configure SMTP credentials
- [ ] Configure Twilio credentials
- [ ] Configure Razorpay live keys
- [ ] Do not commit `.env` or `.env.local`
- [ ] Move uploaded files to persistent/object storage
- [ ] Configure database backups
- [ ] Configure application logging/monitoring
- [ ] Review admin credentials and role permissions
- [ ] Verify payment webhook/verification requirements before going live

---

## Important Notes

### Database Technology

The current repository uses **MongoDB with Mongoose**.

It does **not** currently use MySQL, Prisma, or Redis based on the included project implementation.

### State Management

The frontend uses React Context-based application state in areas such as authentication and chat. Redux is not included in the current `frontend/package.json`.

### REST API

The current backend is REST-based, with Socket.IO added for real-time communication.

---

## Available Scripts

### Backend

```bash
npm start
```

Starts the backend server.

```bash
npm run dev
```

Starts the backend using Nodemon.

```bash
npm run seed
```

Runs the database seed script.

```bash
npm run seed:reset
```

Resets/runs the seed script with the reset option.

```bash
npm test
```

Runs the backend test suite.

### Frontend

```bash
npm run dev
```

Starts Next.js development server on port `5175`.

```bash
npm run build
```

Creates the production build.

```bash
npm start
```

Starts the production Next.js server.

```bash
npm run lint
```

Runs the configured lint command.

---

## Recommended Repository Layout

For GitHub, keep the project as a single repository:

```text
Karyantrix/
├── backend/
├── frontend/
├── README.md
└── .gitignore
```

This makes it easy to maintain the frontend and backend together while still deploying them independently.

---

## Contributing

1. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

2. Make your changes.

3. Test the backend/frontend.

4. Commit your changes.

```bash
git add .
git commit -m "feat: add your feature"
```

5. Push the branch.

```bash
git push origin feature/your-feature
```

6. Open a Pull Request.

---

## License

Add the project's chosen license here before public distribution.

Example:

```text
MIT License
```

---

## Project Status

Karyantrix currently contains a broad service-marketplace implementation including customer, provider, and admin workflows, REST APIs, authentication, payments, real-time chat, uploads, support, reports, wallet operations, analytics, and PWA functionality.

Before production launch, review the environment configuration, payment configuration, storage strategy, security settings, monitoring, backups, and deployment infrastructure.

---

## Author

**Karyantrix**

Service Marketplace Platform
