# HOMA Deployment Guide

**Version:** 1.0  
**Last Updated:** January 31, 2026  
**Platform:** Vercel (Frontend/API) + Neon (Database)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Production Deployment](#production-deployment)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture
```
┌─────────────────┐
│   Vercel        │
│  (Next.js App)  │
│  - Frontend     │
│  - API Routes   │
└────────┬────────┘
         │
         │ HTTPS
         │
         ↓
┌─────────────────┐
│   Neon          │
│  (PostgreSQL)   │
│  - Database     │
└─────────────────┘
```

**Stack:**
- **Frontend/Backend:** Next.js 14 (App Router)
- **Database:** Neon PostgreSQL (Serverless)
- **ORM:** Drizzle ORM
- **Hosting:** Vercel
- **DNS:** (Your domain registrar)

---

### Deployment Flow
```
Local Development
       ↓
   Git Push (staging branch)
       ↓
   Vercel Auto-Deploy (Staging)
       ↓
   Testing on Staging
       ↓
   Git Push (main branch)
       ↓
   Vercel Auto-Deploy (Production)
       ↓
   Smoke Tests
       ↓
   Monitor Production
```

---

## Prerequisites

### Required Tools

**Install these before starting:**

1. **Node.js 18+**
```bash
   # Check version
   node --version  # Should be 18.x or higher
   
   # Install via nvm (recommended)
   nvm install 18
   nvm use 18
```

2. **npm or pnpm**
```bash
   # npm comes with Node.js
   npm --version
   
   # Or install pnpm (faster)
   npm install -g pnpm
```

3. **Git**
```bash
   git --version
```

4. **Vercel CLI** (optional, for local testing)
```bash
   npm install -g vercel
```

5. **Drizzle Kit**
```bash
   npm install -g drizzle-kit
```

---

### Required Accounts

1. **GitHub Account**
   - Repository: `https://github.com/ndiyansahh/homa-intools`
   - Branch strategy: `main` (production), `staging` (testing), `dev` (development)

2. **Vercel Account**
   - Sign up: https://vercel.com
   - Connect to GitHub repository

3. **Neon Account**
   - Sign up: https://neon.tech
   - Create project: "HOMA Production"

---

## Local Development Setup

### Step 1: Clone Repository
```bash
# Clone from GitHub
git clone https://github.com/ndiyansahh/homa-intools.git
cd homa-intools

# Switch to dev branch for local work
git checkout dev
```

---

### Step 2: Install Dependencies
```bash
# Using npm
npm install

# Or using pnpm (faster)
pnpm install
```

**Expected output:**
```
added 342 packages in 45s
```

---

### Step 3: Environment Setup

**Create `.env.local` file:**
```bash
cp .env.example .env.local
```

**Edit `.env.local`:**
```env
# Database (Neon)
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# JWT Secret (generate new one)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Node Environment
NODE_ENV="development"
```

**Generate JWT Secret:**
```bash
# Generate random 32-character string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Step 4: Database Setup (Local Development)

**Option A: Use Neon Dev Branch (Recommended)**
```bash
# 1. Create Neon dev branch (via Neon dashboard)
# 2. Copy dev branch DATABASE_URL
# 3. Update .env.local with dev DATABASE_URL
```

**Option B: Local PostgreSQL**
```bash
# 1. Install PostgreSQL locally
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# 2. Create database
createdb homa_dev

# 3. Update .env.local
DATABASE_URL="postgresql://localhost:5432/homa_dev"
```

---

### Step 5: Run Migrations
```bash
# Generate migration files (if schema changed)
npm run db:generate

# Push schema to database
npm run db:push

# Or manually
drizzle-kit push:pg
```

**Expected output:**
```
✓ Applying migrations...
✓ All migrations applied successfully
```

---

### Step 6: Seed Database (Optional)
```bash
# Run seed script
npm run db:seed

# Or seed users (ADR 0002)
npx tsx scripts/seed-users.ts
```

**Seed script creates:**
- Admin user: `admin@homa.com` / `admin123`
- Owner user: `owner@homa.com` / `owner123`
- Staff user: `staff@homa.com` / `staff123`
- Sample mitras and customers

---

### Step 7: Start Development Server
```bash
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.100:3000

 ✓ Ready in 2.3s
```

**Open browser:** http://localhost:3000

**Test login:**
- Email: `admin@homa.com`
- Password: `admin123`

---

## Database Setup

### Neon Setup (Production & Staging)

#### Step 1: Create Neon Project

1. Go to https://console.neon.tech
2. Click **"New Project"**
3. Settings:
```
   Name: HOMA Production
   Region: AWS ap-southeast-1 (Singapore) - closest to Jakarta
   PostgreSQL version: 15
```
4. Click **"Create Project"**

---

#### Step 2: Get Database Connection String

1. In Neon dashboard, click **"Connection Details"**
2. Copy **"Connection string"**:
```
   postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require
```
3. Save this for later

---

#### Step 3: Create Branches

**Production Branch:**
- Already created as `main`
- Use for production deployments

**Staging Branch:**
1. Click **"Branches"** in sidebar
2. Click **"Create Branch"**
3. Settings:
```
   Name: staging
   Branch from: main
```
4. Click **"Create"**
5. Copy staging DATABASE_URL

**Dev Branch (Optional):**
1. Create another branch: `dev`
2. Use for local development

---

#### Step 4: Configure Neon Settings

**Increase Limits (if needed):**
1. Go to **"Settings"** → **"General"**
2. Upgrade to paid plan if:
   - Need >5GB storage
   - Need >100 compute hours/month
   - Need >7-day backups

**Enable Point-in-Time Restore:**
1. Go to **"Settings"** → **"Backups"**
2. Ensure enabled (automatic)
3. Retention: 7 days (free) or 30 days (paid)

---

### Database Migration Strategy

**Migration Naming:**
```
drizzle/migrations/
├── 0001_create_users.sql
├── 0002_create_customers.sql
├── 0003_create_visits.sql
├── 0004_create_payouts.sql
└── meta/
    └── _journal.json
```

**Generate Migration:**
```bash
# After changing schema in src/lib/schema.ts
npm run db:generate

# This creates new migration file
# Example: 0005_add_user_db.sql
```

**Apply Migration:**
```bash
# Development
npm run db:push

# Production (via Vercel deployment)
# Migrations auto-run on deploy
```

---

### Schema Updates Process

**When to Create Migration:**
- Adding new table ✅
- Adding new column ✅
- Changing column type ✅
- Adding index ✅
- Adding constraint ✅

**When NOT to Create Migration:**
- Changing code logic ❌
- Updating API routes ❌
- UI changes ❌

**Example Workflow:**
```bash
# 1. Edit schema
vim src/lib/schema.ts

# 2. Generate migration
npm run db:generate

# 3. Review generated SQL
cat drizzle/migrations/0005_*.sql

# 4. Test on dev branch
DATABASE_URL="<dev_branch_url>" npm run db:push

# 5. Test application
npm run dev

# 6. If OK, commit
git add drizzle/
git commit -m "Add user_db table (ADR 0002)"

# 7. Deploy to staging
git push origin staging

# 8. Test on staging
# If OK, merge to main
```

---

## Environment Variables

### Required Variables

**Production `.env.production`:**
```env
# Database
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# JWT Secret (CRITICAL - use strong random string)
JWT_SECRET="production-secret-min-32-chars-change-this"

# App URL
NEXT_PUBLIC_APP_URL="https://homa-intools.vercel.app"

# Node Environment
NODE_ENV="production"

# Optional: Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

**Staging `.env.staging`:**
```env
DATABASE_URL="postgresql://user:pass@ep-staging.neon.tech/neondb?sslmode=require"
JWT_SECRET="staging-secret-different-from-production"
NEXT_PUBLIC_APP_URL="https://homa-intools-staging.vercel.app"
NODE_ENV="staging"
```

---

### Setting Environment Variables in Vercel

#### Via Vercel Dashboard:

1. Go to https://vercel.com/dashboard
2. Select project: **homa-intools**
3. Go to **"Settings"** → **"Environment Variables"**
4. Add variables:

**For Production:**
```
DATABASE_URL          | [value] | Production
JWT_SECRET            | [value] | Production
NEXT_PUBLIC_APP_URL   | [value] | Production
```

**For Staging:**
```
DATABASE_URL          | [value] | Preview (staging branch)
JWT_SECRET            | [value] | Preview (staging branch)
NEXT_PUBLIC_APP_URL   | [value] | Preview (staging branch)
```

5. Click **"Save"**

---

#### Via Vercel CLI:
```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Add environment variable
vercel env add DATABASE_URL production
# Paste value when prompted

# Pull environment variables locally (for testing)
vercel env pull .env.local
```

---

### Secrets Management

**CRITICAL - Never Commit:**
- ❌ `.env.local`
- ❌ `.env.production`
- ❌ `.env.staging`
- ❌ Any file with secrets

**Verify .gitignore:**
```bash
cat .gitignore | grep env

# Should contain:
.env
.env.local
.env.production
.env.staging
*.env
```

**Store Secrets Securely:**
- Production secrets: Vercel dashboard only
- Team access: Use Vercel team features
- Local development: Personal `.env.local` (not shared)

---

## Production Deployment

### Option 1: Automatic Deployment (Recommended)

**Setup (One-time):**

1. **Connect GitHub to Vercel:**
   - Go to https://vercel.com/new
   - Click **"Import Git Repository"**
   - Select `ndiyansahh/homa-intools`
   - Click **"Import"**

2. **Configure Project:**
```
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
```

3. **Configure Branch Deployments:**
   - **Production Branch:** `main`
   - **Preview Branches:** `staging`, `dev`

4. **Add Environment Variables** (see above)

5. **Deploy:**
   - Click **"Deploy"**
   - Wait ~2 minutes
   - Production URL: `https://homa-intools.vercel.app`

---

**Ongoing Deployments:**
```bash
# Development → Staging
git checkout staging
git merge dev
git push origin staging
# Vercel auto-deploys to staging URL

# Staging → Production (after testing)
git checkout main
git merge staging
git push origin main
# Vercel auto-deploys to production URL
```

**Deployment takes:** 1-3 minutes  
**Automatic rollback:** If build fails, previous version stays live

---

### Option 2: Manual Deployment (Vercel CLI)

**Install CLI:**
```bash
npm install -g vercel
```

**Deploy to Production:**
```bash
# Login
vercel login

# Deploy
vercel --prod

# Follow prompts
```

**Deploy to Preview (Staging):**
```bash
vercel

# No --prod flag = preview deployment
```

---

### Deployment Checklist

**Before Every Production Deploy:**

- [ ] All tests passing locally
```bash
  npm run test
```

- [ ] No console errors in browser
```bash
  npm run build
  npm run start
  # Test in browser
```

- [ ] Database migrations generated (if schema changed)
```bash
  npm run db:generate
```

- [ ] Environment variables updated in Vercel (if changed)

- [ ] Staging tested and approved
```bash
  # Deploy to staging first
  git push origin staging
  # Test staging URL
  # If OK, proceed to production
```

- [ ] Backup database (before major changes)
```bash
  # Neon auto-backup always on
  # But create manual snapshot for safety
  # Via Neon dashboard: Branches → Create Branch
```

- [ ] Team notified (if downtime expected)

---

## Post-Deployment Checklist

### Immediate Checks (Within 5 Minutes)

**1. Deployment Success:**
```bash
# Check Vercel dashboard
# Status should be "Ready"
```

**2. Site Accessible:**
```bash
# Visit production URL
curl https://homa-intools.vercel.app

# Should return 200 OK
```

**3. Critical Paths Working:**
```
✓ Login page loads
✓ Can login with test account
✓ Dashboard loads
✓ Customer list loads
✓ Can create customer
✓ Payout calculation works
```

**4. Database Connection:**
```bash
# Check Vercel logs
vercel logs

# Look for database connection success
# Should NOT see connection errors
```

**5. No Console Errors:**
```
Open browser DevTools → Console
Should see no errors
```

---

### Extended Checks (Within 30 Minutes)

**6. API Endpoints:**
```bash
# Test critical APIs
curl https://homa-intools.vercel.app/api/customers \
  -H "Cookie: session=<valid_token>"

# Should return JSON
```

**7. Database Queries:**
```bash
# Run sample queries
# Via API or direct database connection
# Verify data integrity
```

**8. Performance:**
```bash
# Check page load times
# Should be <2 seconds for main pages
```

**9. Timezone Handling:**
```bash
# Create test visit
# Verify time shows as Asia/Jakarta (WIB)
```

**10. Error Monitoring:**
```bash
# Check Vercel error logs
vercel logs --follow

# Should see normal requests
# No 500 errors
```

---

### Smoke Test Script
```bash
#!/bin/bash
# smoke-test.sh

BASE_URL="https://homa-intools.vercel.app"

echo "🚀 Running smoke tests..."

# Test 1: Home page
echo "Test 1: Home page"
curl -s -o /dev/null -w "%{http_code}" $BASE_URL
if [ $? -eq 0 ]; then
  echo "✅ Home page: PASS"
else
  echo "❌ Home page: FAIL"
  exit 1
fi

# Test 2: Login page
echo "Test 2: Login page"
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/login
if [ $? -eq 0 ]; then
  echo "✅ Login page: PASS"
else
  echo "❌ Login page: FAIL"
  exit 1
fi

# Test 3: API health
echo "Test 3: API health"
curl -s $BASE_URL/api/health | grep "ok"
if [ $? -eq 0 ]; then
  echo "✅ API health: PASS"
else
  echo "❌ API health: FAIL"
  exit 1
fi

echo "🎉 All smoke tests passed!"
```

**Run:**
```bash
chmod +x smoke-test.sh
./smoke-test.sh
```

---

## Rollback Procedures

### Scenario 1: Bad Deployment (Immediate Rollback)

**Via Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Select project: **homa-intools**
3. Go to **"Deployments"** tab
4. Find last known-good deployment
5. Click **"⋯"** → **"Promote to Production"**
6. Confirm

**Rollback time:** ~30 seconds  
**Downtime:** None (instant switch)

---

**Via Vercel CLI:**
```bash
# List recent deployments
vercel ls

# Find deployment ID of last good version
# Example: dpl_abc123

# Promote to production
vercel promote dpl_abc123

# Or rollback to previous
vercel rollback
```

---

### Scenario 2: Database Migration Failed

**If migration breaks production:**

1. **Check Neon logs:**
   - Go to Neon dashboard
   - Check query logs
   - Identify failing migration

2. **Option A: Fix Forward**
```bash
   # Create hotfix migration
   # Fix the issue
   npm run db:generate
   
   # Deploy fix
   git add drizzle/migrations/
   git commit -m "Fix migration issue"
   git push origin main
```

3. **Option B: Restore from Backup**
```bash
   # Via Neon dashboard
   # Branches → Restore from point-in-time
   # Select timestamp before migration
   # Restore to new branch
   
   # Update DATABASE_URL in Vercel
   # Point to restored branch
```

**Recovery time:** 5-15 minutes

---

### Scenario 3: Data Corruption

**If bad deployment corrupts data:**

1. **Immediately rollback deployment** (see Scenario 1)

2. **Restore database:**
```bash
   # Neon: Point-in-time restore
   # Restore to 1 hour before deploy
```

3. **Verify data integrity:**
```bash
   # Run validation queries
   # Check critical tables
```

4. **Investigate root cause:**
```bash
   # Review git diff
   git diff main~1 main
   
   # Identify problematic code
```

5. **Fix and redeploy:**
```bash
   # Fix code
   # Test thoroughly in staging
   # Deploy to production
```

---

### Rollback Decision Tree
```
Deployment Issue Detected
         ↓
   Is it critical?
    /          \
  YES          NO
   ↓            ↓
Rollback    Monitor & Fix
Immediately   Next Deploy
   ↓
Investigate
   ↓
Fix & Redeploy
```

---

## Monitoring & Logging

### Vercel Analytics

**Enable Analytics:**

1. Go to Vercel dashboard
2. Select project
3. Go to **"Analytics"** tab
4. Enable **"Audience"** and **"Performance"**

**What to Monitor:**
- Page views
- Unique visitors
- Top pages
- Load times (p50, p95, p99)
- Error rates

**Access:**
- Dashboard: https://vercel.com/dashboard/analytics
- Real-time: Updates every minute

---

### Vercel Logs

**View Logs:**

**Via Dashboard:**
1. Go to project
2. Select **"Deployments"**
3. Click on deployment
4. View **"Function Logs"**

**Via CLI:**
```bash
# Real-time logs
vercel logs --follow

# Filter by function
vercel logs --follow api/customers

# Last 100 entries
vercel logs --limit=100
```

**What to Look For:**
- 500 errors (server errors)
- Database connection errors
- Slow queries (>500ms)
- Authentication failures

---

### Database Monitoring (Neon)

**Neon Metrics:**
1. Go to Neon dashboard
2. Select **"Monitoring"**

**Key Metrics:**
- Active connections
- Query latency
- Data transfer (egress)
- Storage used

**Set Alerts:**
1. Go to **"Settings"** → **"Alerts"**
2. Configure:
```
   Storage >90% → Email alert
   Connection errors >10/min → Email alert
```

---

### Health Check Endpoint

**Create API health check:**
```typescript
// src/app/api/health/route.ts
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check database connection
    await db.execute('SELECT 1');
    
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    }, { status: 500 });
  }
}
```

**Monitor with uptime service:**
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- StatusCake: https://www.statuscake.com

**Configure:**
```
URL: https://homa-intools.vercel.app/api/health
Interval: Every 5 minutes
Alert if: Status ≠ 200 for 2 consecutive checks
```

---

## Troubleshooting

### Common Deployment Issues

#### Issue 1: Build Fails

**Error:**
```
Error: Module not found: Can't resolve '@/components/...'
```

**Solution:**
```bash
# Check tsconfig.json paths
cat tsconfig.json

# Should have:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Verify file exists
ls src/components/...
```

---

#### Issue 2: Database Connection Fails

**Error:**
```
Error: connect ETIMEDOUT
```

**Solution:**
```bash
# 1. Verify DATABASE_URL in Vercel env vars
vercel env ls

# 2. Check Neon database is running
# Go to Neon dashboard, verify branch is active

# 3. Test connection locally
DATABASE_URL="<production_url>" npm run db:push

# 4. Check IP whitelist (Neon doesn't restrict by default)
```

---

#### Issue 3: Environment Variables Not Loading

**Error:**
```
Error: JWT_SECRET is not defined
```

**Solution:**
```bash
# 1. Verify env vars set in Vercel
vercel env ls

# 2. Check correct environment (Production vs Preview)

# 3. Redeploy to pick up new env vars
vercel --prod

# 4. In code, verify access:
console.log(process.env.JWT_SECRET ? 'SET' : 'NOT SET');
```

---

#### Issue 4: Migration Fails on Deploy

**Error:**
```
Error: relation "new_table" already exists
```

**Solution:**
```bash
# 1. Check migration journal
cat drizzle/migrations/meta/_journal.json

# 2. Manually check database
psql $DATABASE_URL
\dt  # List tables

# 3. If table exists, skip migration or drop
DROP TABLE new_table;

# 4. Re-run migration
npm run db:push
```

---

#### Issue 5: 500 Error After Deploy

**Error:**
```
Internal Server Error (500)
```

**Solution:**
```bash
# 1. Check Vercel logs
vercel logs --follow

# 2. Look for stack trace

# 3. Common causes:
# - Missing env var
# - Database connection timeout
# - Syntax error in code

# 4. Test locally with production build
npm run build
npm run start

# 5. If works locally, issue is env-specific
# Check production DATABASE_URL, JWT_SECRET, etc.
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Check Vercel logs for errors
- [ ] Review database size (Neon dashboard)
- [ ] Test critical user flows

**Monthly:**
- [ ] Review and clear old logs
- [ ] Check for outdated dependencies
```bash
  npm outdated
```
- [ ] Review analytics for issues
- [ ] Database backup verification

**Quarterly:**
- [ ] Security audit
```bash
  npm audit
```
- [ ] Performance review
- [ ] Dependency updates
```bash
  npm update
```

---

## Related Documents

- **Database Schema:** `docs/technical/database-schema.md`
- **API Documentation:** `docs/technical/api-documentation.md`
- **Active Context:** `docs/01-active-context.md`
- **ADRs:** `docs/adrs/`

---

## Quick Reference

**Deploy to Production:**
```bash
git checkout main
git merge staging
git push origin main
```

**Rollback:**
```bash
vercel rollback
```

**View Logs:**
```bash
vercel logs --follow
```

**Database Migration:**
```bash
npm run db:generate
git add drizzle/
git commit -m "Add migration"
git push
```

---

**Document Version:** 1.0  
**Last Updated:** January 31, 2026  
**Maintained By:** Handi (Developer)  
**Production URL:** https://homa-intools.vercel.app  
**Staging URL:** https://homa-intools-staging.vercel.app
