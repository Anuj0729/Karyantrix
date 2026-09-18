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

### Reliability, Scaling & DevOps

- Asynchronous OTP/email delivery via a Redis-backed BullMQ queue, so verification requests don't block on SMTP/SMS calls and failed sends retry automatically
- Redis-backed Socket.IO adapter for running multiple backend instances behind a load balancer without losing real-time events
- Pluggable file storage — local disk for simple setups, or S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, Backblaze B2) for multi-instance deployments
- Dockerized backend, background worker, and frontend, orchestrated with Docker Compose for local dev and production
- CI/CD pipeline (GitHub Actions): automated tests + lint + build on every PR, and an automated build → push → SSH-deploy → health-check flow on merge to `main`
- Expanded automated test coverage (auth, categories, requirements, bookings, chat, payments)

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
| Redis (`redis`, `ioredis`) | Socket.IO adapter (multi-instance scaling) + BullMQ connection |
| BullMQ | Background job queue (OTP/email delivery) |
| @socket.io/redis-adapter | Horizontal scaling for Socket.IO across instances |
| JWT | Authentication |
| Google Auth Library | Google authentication |
| Razorpay | Payments |
| Nodemailer | Email delivery (OTP/verification emails) |
| Twilio | SMS/OTP delivery |
| Multer | File uploads |
| AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`) | Object storage driver (S3 / S3-compatible: R2, MinIO, B2) |
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
- Redis-backed Socket.IO adapter for horizontal scaling
- Pluggable file storage: local disk or S3-compatible object storage
- Dockerized backend, worker, and frontend with a CI/CD pipeline (GitHub Actions) for automated build, test, and deployment

### Testing

- Jest
- Supertest
- MongoDB Memory Server
- Authentication tests
- Category tests
- Requirement tests
- Booking tests
- Chat tests
- Payment tests

---

## Project Structure

```text
Karyantrix/
│
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   ├── razorpay.js
│   │   ├── redis.js
│   │   ├── queueConnection.js
│   │   ├── objectStorage.js
│   │   ├── storage.js
│   │   └── swagger.js
│   │
│   ├── jobs/
│   │   ├── otpQueue.js
│   │   ├── otpWorker.js
│   │   └── worker.js
│   │
│   ├── services/
│   │   └── storageService.js
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
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── app/
│   │   ├── admin/
│   │   ├── become-provider/
│   │   ├── bookings/
│   │   ├── categories/
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── messages/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── provider/
│   │   ├── providers/
│   │   ├── register/
│   │   ├── services/
│   │   └── support/
│   │
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── public/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   └── next.config.js
│
├── .github/
│   └── workflows/
│       ├── ci.yml            # tests + lint + build on every PR/branch push
│       └── cd.yml            # build & push images, deploy to production on merge to main
│
├── docker-compose.yml         # production topology (mongo, redis, backend, worker, frontend)
├── docker-compose.override.yml# local dev: builds images from source (auto-loaded)
├── docker-compose.prod.yml    # production hardening overrides
├── DEPLOYMENT.md              # full Docker/CI-CD deployment guide
└── .env.example               # compose-level environment variables
```

---

## Prerequisites

Make sure the following are installed:

- Node.js 18+ recommended
- npm
- MongoDB
- Redis (used for the Socket.IO adapter and the BullMQ OTP/email queue — can be disabled with `REDIS_ENABLED=false` for local single-instance dev without Redis)
- Git

For production integrations, you will also need credentials for the services you enable:

- Google OAuth
- SMTP/email provider
- Twilio
- Razorpay
- An S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, Backblaze B2) if `STORAGE_DRIVER=s3`

> **Alternative:** instead of installing MongoDB/Redis locally, you can run the entire stack (MongoDB, Redis, backend, worker, frontend) with Docker Compose — see [Production Deployment](#production-deployment) and `DEPLOYMENT.md`.

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
RAZORPAY_WEBHOOK_SECRET=

BOOKING_ADVANCE_PERCENT=20

# Redis (Socket.IO adapter — required for multi-instance/horizontal scaling)
REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379

# OTP/Email job queue (BullMQ, uses REDIS_URL above)
RUN_WORKER_IN_PROCESS=true
OTP_WORKER_CONCURRENCY=5

# File storage: 'local' (default, saves under UPLOAD_ROOT and serves via
# /uploads) or 's3' (uploads to an S3-compatible bucket instead — AWS S3,
# Cloudflare R2, MinIO, Backblaze B2 all work the same way here)
STORAGE_DRIVER=local

# --- Only needed when STORAGE_DRIVER=s3 ---
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=
```

> Never commit real secrets, API keys, passwords, JWT secrets, or payment credentials to GitHub. A sanitized `backend/.env.example` is included in the repo as a starting template.

### Frontend

Create:

```text
frontend/.env.local
```

Example:

```env
SITE_URL=http://localhost:5175
API_URL=http://localhost:5000
GOOGLE_CLIENT_ID=
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

By default the OTP/email BullMQ worker starts automatically inside the API
process. To run it as a separate process instead (recommended once you
need to scale OTP/email sending independently), set
`RUN_WORKER_IN_PROCESS=false` in `backend/.env` and run:

```bash
npm run worker
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

### Or run everything with Docker Compose

Instead of installing MongoDB/Redis/Node locally and starting each piece
by hand, you can bring up the whole stack (MongoDB, Redis, backend API,
OTP worker, and frontend) with a single command:

```bash
docker compose up --build
```

This uses `docker-compose.yml` together with `docker-compose.override.yml`
(auto-loaded for local dev, adds the `build:` step). See
[Production Deployment](#production-deployment) and `DEPLOYMENT.md` for
the production-grade compose setup and the CI/CD pipeline.

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

Uploads are handled through Multer, and where they're stored is controlled
by `STORAGE_DRIVER` (`backend/services/storageService.js` +
`backend/config/objectStorage.js`):

- **`local`** (default) — files are saved under `UPLOAD_ROOT` and served
  from the backend at `/uploads`.
- **`s3`** — files are streamed straight to an S3-compatible bucket (AWS
  S3, Cloudflare R2, MinIO, Backblaze B2) via the AWS SDK v3, and public
  URLs are built from `S3_PUBLIC_URL` (or a sensible default). This is the
  recommended mode once you run more than one backend replica, since local
  disk isn't shared between containers/instances.

Switching drivers is a config-only change — set `STORAGE_DRIVER=s3` and
the matching `S3_*` variables in `backend/.env`, no code changes needed.

---

## Database & Infrastructure

The primary datastore is:

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

**Redis** is used alongside MongoDB for two purposes:

- Backing the `@socket.io/redis-adapter` so Socket.IO events fan out
  correctly across multiple backend instances (`backend/config/redis.js`).
- Providing the connection BullMQ uses for the OTP/email job queue
  (`backend/config/queueConnection.js`).

Redis can be disabled for local single-instance development by setting
`REDIS_ENABLED=false` — the app falls back to Socket.IO's in-memory
adapter and a direct-send fallback for OTPs.

---

## Background Jobs (OTP/Email Queue)

OTP and verification emails/SMS are sent asynchronously through a BullMQ
queue backed by Redis, instead of blocking the request that triggers them:

- `backend/jobs/otpQueue.js` — defines the `otp-jobs` queue and
  `enqueueOtp(method, destination, otp)`, used by auth/booking flows to
  enqueue a `send-otp-email` or `send-otp-sms` job. Jobs retry up to 3
  times with exponential backoff on failure.
- `backend/jobs/otpWorker.js` — the worker that consumes the queue and
  actually calls `sendOTPEmail`/`sendOTPSms`. It starts automatically
  inside the API process by default (see `RUN_WORKER_IN_PROCESS`).
- `backend/jobs/worker.js` — a standalone entry point (`npm run worker`)
  to run the same worker as its own process/container, so OTP/email
  sending can be scaled independently from the API.

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
- Bookings
- Chat
- Payments

Tests use Supertest and MongoDB Memory Server where applicable — the
in-memory server means the full suite runs without a real MongoDB
instance, which is also how it runs in CI (see `.github/workflows/ci.yml`).

---

## Production Deployment

The project can be deployed either manually (frontend and backend as
separate Node processes) or via the included Docker/CI-CD pipeline. The
Docker path is the recommended one for production.

### Docker & CI/CD (recommended)

The repository includes:

```text
backend/Dockerfile              # multi-stage backend image (API + worker)
frontend/Dockerfile             # multi-stage Next.js production image
docker-compose.yml              # base production topology
docker-compose.override.yml     # local dev: builds from source (auto-loaded)
docker-compose.prod.yml         # production hardening (no exposed DB ports, restart policies, log limits)
.github/workflows/ci.yml        # tests + lint + build on every PR/branch push
.github/workflows/cd.yml        # build & push images, then deploy on push to main
DEPLOYMENT.md                   # full step-by-step deployment guide
```

At a high level, `cd.yml` is the production deployment path:

1. **Test** — backend Jest suite + frontend lint/build gate the release.
2. **Build & push** — both Dockerfiles are built and pushed to GHCR,
   tagged with the git commit SHA and `latest`.
3. **Deploy** — GitHub Actions SSHes into the production host, pulls the
   new images, and rolls them out with:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```
   then verifies `/api/health` before finishing.

Every image is tagged by git SHA, so rolling back is just redeploying an
older `IMAGE_TAG`. Full setup instructions (required GitHub secrets,
one-time server setup, rollback commands) are in **`DEPLOYMENT.md`**.

### Manual deployment

If you'd rather deploy the frontend and backend as plain Node processes
instead of Docker:

**Frontend**

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

**Backend**

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

and uses the `PORT` environment variable. Run `npm run worker` as a
separate process for the OTP/email queue if `RUN_WORKER_IN_PROCESS=false`.

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
API_URL=https://your-api-domain.com
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
- [ ] Set `STORAGE_DRIVER=s3` and configure a production bucket if running multiple backend replicas
- [ ] Use a dedicated production Redis instance (not the default local/dev one) and secure it
- [ ] Configure database backups
- [ ] Configure application logging/monitoring
- [ ] Review admin credentials and role permissions
- [ ] Verify payment webhook/verification requirements before going live
- [ ] Set the required GitHub Actions secrets for the CD pipeline (see `DEPLOYMENT.md`)
- [ ] Don't expose MongoDB/Redis ports publicly (`docker-compose.prod.yml` already does this)

---

## Important Notes

### Database Technology

The current repository uses **MongoDB with Mongoose** as its primary
database, plus **Redis** for the Socket.IO adapter and the BullMQ
OTP/email job queue.

It does **not** use MySQL or Prisma.

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

```bash
npm run worker
```

Starts the BullMQ OTP/email worker as a standalone process (use this
alongside `RUN_WORKER_IN_PROCESS=false` to scale job processing
independently of the API).

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
├── .github/workflows/
├── docker-compose.yml
├── docker-compose.override.yml
├── docker-compose.prod.yml
├── DEPLOYMENT.md
├── .env.example
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
