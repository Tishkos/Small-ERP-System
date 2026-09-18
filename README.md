# ERP

Production-grade ERP / Sales & Inventory Management System built with Next.js.

You name the installation during setup: the company name and logo you choose are
used throughout the app and on every document it prints.

## Overview

A multi-language (Arabic, English, Kurdish) ERP-style web application that manages:
- Products & Categories
- Motorcycles (dedicated inventory)
- Sales (Retail Mufrad & Wholesale Jumla)
- Invoices
- Customers & Balances
- Employees & Permissions
- Draft System (never lose data)
- Your own company branding (name + logo)

## Architecture

This application follows **Domain-Driven Design (DDD)** principles with clear layer separation:

- **Presentation Layer**: Next.js App Router, React Components
- **Application Layer**: Server Actions, API Routes
- **Domain Layer**: Business Logic, Domain Services
- **Infrastructure Layer**: Prisma, Database, External Services

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture documentation.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (JWT)
- **UI**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **i18n**: next-intl (Arabic, English, Kurdish)
- **State**: Zustand (for client state)

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- npm/pnpm/yarn

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd Small-ERP-System
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: Random secret (min 32 chars) — signs the session JWT
- `JWT_SECRET`: Random secret (min 32 chars)

Sign-in is username/email + password. No email is sent and no verification code
is involved, so SMTP settings are optional.

> **Serving over plain HTTP?** Keep `NEXTAUTH_URL` on `http://...`. The session
> cookie name is derived from this scheme, and a mismatch signs users straight
> back out.

Every variable is documented inline in [`.env.example`](./.env.example).

### 3. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed an admin user plus sample data (recommended on a fresh install)
npm run db:seed
```

The seed creates the company record plus an active administrator. By default
that account is:

| Username | Password |
|---|---|
| `admin` | `admin` |

Because that password ships with the project, the app blocks on a
non-dismissible **"Choose a new password"** dialog on first sign-in and will not
let you in until you set a real one. Set `SEED_ADMIN_PASSWORD` in `.env` to pick
your own up front and skip that prompt.

The seed is safe to re-run: it upserts and never resets an existing password.

### 4. Name your company

Prefer to start clean? Skip `npm run db:seed` and open the app — with no
accounts yet you land on the **setup wizard**, which asks for:

1. **Company name and logo** — used in the sidebar, on the sign-in screen, in the
   browser tab and on every printed document. Upload a PNG, JPG or WebP (up to
   2MB); without one the app draws a monogram from your company initials.
2. **Your administrator account** — name, username, email and password.

Setup runs once. After that the wizard is closed permanently and the same
settings live under **Settings → Company** (administrators only).

### 5. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Using Docker (Alternative)

```bash
# Start database
docker-compose -f docker-compose.dev.yml up -d db

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

## Project Structure

```
app/                    # Next.js App Router (routes live at the repo root)
├── [locale]/           # Locale-prefixed pages: (auth) and (dashboard) groups
└── api/                # Route handlers

src/
├── modules/            # Domain modules (DDD)
│   ├── auth/
│   ├── drafts/         # Critical: Draft system (domain, repositories, services)
│   └── sales/
├── components/         # Feature components
│   └── ui/             # shadcn/ui primitives
├── hooks/              # Shared React hooks
├── i18n/               # next-intl request config
└── lib/                # Utilities (db, auth, i18n, logger, pdf, etc.)

prisma/
├── schema.prisma       # Database schema
├── migrations/         # Migration history
└── seed.ts             # Seed data (npm run db:seed)

messages/               # i18n translations
├── ar.json
├── en.json
└── ku.json

docs/                   # All project documentation
```

See [FOLDER_STRUCTURE.md](./docs/FOLDER_STRUCTURE.md) for detailed structure.

## Key Features

### Draft System

Drafts are **first-class entities** that persist in the database. They:
- Survive browser close, refresh, logout
- Auto-save on every change
- Can be resumed anytime
- Convert to Sale + Invoice on finalization

See [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md#draft-lifecycle-design) for details.

### Authentication & Authorization

- Username **or** email + password sign-in (no email verification step)
- Accounts are created by the setup wizard or by an administrator
- Temporary lockout after 5 failed sign-in attempts
- Forced password change for accounts still on a shipped default
- Self-service password change in **Settings**
- Role-based access control (RBAC) with granular permissions
- JWT-based sessions

See [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md#authentication--authorization-flow) for details.

### Company Branding

The installation carries your own identity rather than a hardcoded brand:

- Company **name** and **logo** are chosen during setup and stored in the
  database, so changing them needs no redeploy.
- Both appear in the sidebar, on the sign-in and setup screens, in the browser
  tab title, and on generated PDFs (price lists, invoices).
- No logo? The app renders a clean monogram from the company initials, so there
  is never a broken-image placeholder.
- Logos are uploaded to `public/uploads/branding/` and served through
  `/api/serve`, which is what makes a newly uploaded logo appear immediately in
  a Docker deployment.
- Accepted formats are PNG, JPG and WebP (max 2MB). SVG is rejected on purpose:
  it is served as `image/svg+xml` and can carry script, which would make the
  logo field a stored-XSS vector.

Administrators can change either at any time under **Settings → Company**.

### Internationalization (i18n)

- Full Arabic (RTL), English (LTR), Kurdish (LTR) support
- Locale-aware routing
- Direction-aware layouts
- Printable invoices in all languages

See [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md#i18n-strategy) for details.

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database

# Backup & Restore
npm run backup           # Export all data to JSON (with images as base64)
npm run restore          # Import data from JSON backup file

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

## Data Backup & Restore

### Export Data (Backup)

Export all data including images as JSON:

```bash
# Export to default location (./backups/arbati-backup-YYYY-MM-DD.json)
npm run backup

# Export to custom file
npm run backup -- --output my-backup.json

# Export without images (faster, smaller file)
npm run backup -- --include-images=false
```

Or via API (Admin/Developer only):
```bash
curl -H "Cookie: your-session-cookie" \
  "http://localhost:3000/api/backup/export?includeImages=true" \
  -o backup.json
```

### Import Data (Restore)

Import data from JSON backup:

```bash
# Import from backup file
npm run restore -- backups/arbati-backup-2026-01-10.json

# Clear existing data before importing (⚠️ DANGEROUS)
npm run restore -- backups/backup.json --clear-existing

# Skip restoring images (use existing files)
npm run restore -- backups/backup.json --skip-images
```

Or via API (Admin/Developer only):
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d @backup.json \
  "http://localhost:3000/api/backup/import"
```

### Backup File Structure

The backup JSON file contains:
- All database tables (categories, products, motorcycles, customers, invoices, sales, payments, etc.)
- Images as base64-encoded strings (if `includeImages=true`)
- Attachments as base64-encoded strings
- Complete relational data with all foreign keys
- Metadata (export date, version, summary)

**Note**: User passwords are NOT exported. Users must reset their passwords after restore.

## Production Deployment with Docker

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- VPS/Server with at least 2GB RAM and 10GB storage

### Step 1: Prepare Your VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose (if not installed)
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone <your-repository-url>
cd arbati

# Create environment file
cp .env.example .env

# Edit .env with your production values
nano .env
```

Required environment variables for production:

```env
# Database
DATABASE_URL=postgresql://arbati:secure_password@db:5432/arbati?schema=public
POSTGRES_USER=arbati
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=arbati

# Authentication
AUTH_SECRET=your_random_secret_min_32_chars_long
JWT_SECRET=your_jwt_secret_min_32_chars_long

# Application URLs
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email (SMTP) - Optional. Sign-in never sends email; these are only used if
# you turn on notifications.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
APPROVAL_EMAIL=admin@yourdomain.com

# Port (optional, defaults to 3000)
PORT=3000
```

**Security Tip**: Generate secure secrets:
```bash
openssl rand -base64 32  # For AUTH_SECRET
openssl rand -base64 32  # For JWT_SECRET
```

### Step 3: Deploy with Docker Compose

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f web
docker compose logs -f db

# Run database migrations
docker compose exec web npx prisma migrate deploy

# Generate Prisma Client (if needed)
docker compose exec web npx prisma generate
```

### Step 4: Configure Reverse Proxy (Nginx)

Install and configure Nginx as reverse proxy:

```bash
sudo apt install nginx -y
```

Create Nginx configuration `/etc/nginx/sites-available/arbati`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase body size for file uploads
    client_max_body_size 50M;
}
```

Enable site and test:

```bash
sudo ln -s /etc/nginx/sites-available/arbati /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

### Step 6: Backup Before First Launch

**IMPORTANT**: Always backup before launching in production:

```bash
# Create backups directory
mkdir -p ./data/backups

# Export data before first use
docker compose exec web npm run backup

# Or if running locally before dockerization
npm run backup
```

The backup will be saved to `./data/backups/arbati-backup-YYYY-MM-DD.json`

### Step 7: Regular Backups

Set up automated backups using cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/arbati && docker compose exec -T web npm run backup >> /var/log/arbati-backup.log 2>&1

# Or backup directly from database
0 2 * * * docker compose exec -T db pg_dump -U arbati arbati > /path/to/backups/db-backup-$(date +\%Y-\%m-\%d).sql
```

### Docker Commands Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Stop and remove volumes (⚠️ deletes database)
docker compose down -v

# View logs
docker compose logs -f web
docker compose logs -f db

# Execute commands in container
docker compose exec web npm run backup
docker compose exec web npm run restore -- backups/file.json
docker compose exec web npx prisma studio  # Access Prisma Studio

# Rebuild after code changes
docker compose up -d --build

# Update and restart
docker compose pull
docker compose up -d --build

# Access container shell
docker compose exec web sh
docker compose exec db psql -U arbati -d arbati
```

### Persistent Data Volumes

Data is persisted in:
- `./data/public/` - Images and attachments (products, motorcycles, customers, profiles)
- `./data/backups/` - Backup JSON files
- `postgres_data` (Docker volume) - Database files

**Important**: Backup these directories regularly!

### Troubleshooting

**Container won't start:**
```bash
# Check logs
docker compose logs web

# Check if port is already in use
sudo lsof -i :3000

# Restart services
docker compose restart
```

**Database connection issues:**
```bash
# Check database is healthy
docker compose ps db

# Check database logs
docker compose logs db

# Test connection
docker compose exec db pg_isready -U arbati
```

**Out of memory:**
- Increase Docker memory limit
- Check with: `docker stats`

**Migration errors:**
```bash
# Reset database (⚠️ deletes all data)
docker compose exec web npx prisma migrate reset

# Or manually run migrations
docker compose exec web npx prisma migrate deploy
```

## Manual Deployment (Without Docker)

1. **Set environment variables** in `.env`
2. **Build**: `npm run build`
3. **Generate Prisma Client**: `npm run db:generate`
4. **Run migrations**: `npm run db:migrate`
5. **Start**: `npm run start`

## Backup & Restore Details

### What Gets Backed Up

The backup includes **everything**:
- ✅ Products (with images and attachments as base64)
- ✅ Motorcycles (with images and attachments as base64)
- ✅ Customers (with images and attachments as base64)
- ✅ Invoices (complete with all items)
- ✅ Sales (complete with all items)
- ✅ Customer Payments/Balances
- ✅ Drafts (saved invoices)
- ✅ Categories and Addresses
- ✅ Users (without passwords - must reset after restore)
- ✅ Employees
- ✅ Stock Movements
- ✅ Activity Logs
- ✅ All relationships and foreign keys

### Backup Workflow

1. **Before launching**: Always backup first
   ```bash
   npm run backup
   ```

2. **Regular backups**: Set up automated daily backups
   ```bash
   # Add to crontab for daily backups
   0 2 * * * cd /path/to/arbati && npm run backup
   ```

3. **Before major changes**: Backup before updates
   ```bash
   npm run backup -- --output pre-update-backup.json
   ```

4. **After restore**: Users must reset passwords
   - Admin users can reset passwords via user management
   - Or use password reset flow

### Restore Workflow

1. **Prepare backup file**: Ensure backup JSON is valid
   ```bash
   # Validate JSON structure
   cat backup.json | jq '.version'
   ```

2. **Choose restore mode**:
   - **Incremental** (default): Upserts data, keeps existing records
   - **Full replace** (`--clear-existing`): ⚠️ Deletes all data first

3. **Run restore**:
   ```bash
   npm run restore -- backups/backup.json
   ```

4. **Verify**: Check data in application
5. **Reset passwords**: All users must reset passwords

### File Locations

- **Backups**: `./backups/` directory (created automatically)
- **Images**: Stored in `public/products/`, `public/attachments/`, `public/profiles/`
- **Docker volumes**: `./data/` directory (persisted outside containers)

## Documentation

All documentation lives in [`docs/`](./docs/README.md). Most-used entry points:

- [QUICK_START.md](./docs/QUICK_START.md) - Clone to running app
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [FOLDER_STRUCTURE.md](./docs/FOLDER_STRUCTURE.md) - Project structure
- [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md) - Implementation details
- [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - Common setup and deploy failures
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Docker and VPS deployment

## Contributing

This is a production system. Follow these guidelines:

1. **No business logic in components** - Use domain services
2. **Use TypeScript strictly** - No `any` types
3. **Follow DDD principles** - Keep domain logic in modules
4. **Write tests** - Unit tests for domain logic
5. **Audit everything** - Log critical operations

## License

Proprietary

## Support

For issues or questions, contact the development team.
