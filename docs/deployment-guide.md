# HOMA Deployment Guide

**Last Updated:** 2026-03-09

---

## Overview

This guide ensures **safe and consistent deployments** to staging and production environments.

**Critical Rule:** Database migrations do NOT auto-apply on deploy. You must run them manually.

---

## Quick Reference

### Staging Deployment
```bash
ssh root@194.233.68.67
cd /var/www/homa-staging
./scripts/deploy-staging.sh
```

### Production Deployment
```bash
ssh root@194.233.68.67
cd /var/www/homa-production
./scripts/deploy-production.sh
```

---

## Pre-Deployment Checklist

### For Staging

- [ ] Code is committed and pushed to `staging` branch
- [ ] Build passes locally: `npm run build`
- [ ] Type check passes: `npm run type-check`
- [ ] No obvious errors in code review

### For Production

- [ ] **MANDATORY:** Tested on staging first
- [ ] All tests passing
- [ ] Code reviewed by another developer
- [ ] Deploy during low traffic hours (10 PM - 6 AM WIB)
- [ ] Customer support team notified (if major changes)
- [ ] Rollback plan ready

---

## Deployment Process

### Staging Deployment (Automated)

The `deploy-staging.sh` script will:

1. **Create backup** - Database + .env file
2. **Check git status** - Warn if uncommitted changes
3. **Pull latest code** - From `staging` branch
4. **Install dependencies** - If package.json changed
5. **Run migrations** - If schema changes detected (requires confirmation)
6. **Build application** - Run production build
7. **Restart PM2** - Zero-downtime restart
8. **Health check** - Verify app is running

**Example run:**
```bash
cd /var/www/homa-staging
bash scripts/deploy-staging.sh

# Output:
# ========================================
#   HOMA Staging Deployment Script
# ========================================
#
# [1/8] Creating backup...
# ✓ Database backed up to: /var/backups/homa-staging/db_backup_20260309_143022.sql
# ...
# ✓ Deployment Successful!
```

### Production Deployment (Heavily Guarded)

The `deploy-production.sh` script includes **extra safety checks**:

1. **Confirmation prompt** - Type "DEPLOY TO PRODUCTION" to continue
2. **Pre-deployment checklist** - 4 required questions
3. **Mandatory migration review** - Cannot skip if schema changed
4. **Multiple health checks** - Tests login, API endpoints
5. **Auto-rollback on failure** - Reverts to previous commit

**Example run:**
```bash
cd /var/www/homa-production
bash scripts/deploy-production.sh

# You will be prompted:
# ⚠️  WARNING: This is a PRODUCTION deployment!
# Type 'DEPLOY TO PRODUCTION' to continue: DEPLOY TO PRODUCTION
#
# Pre-deployment checklist:
# 1. Has this been tested on staging? (yes/no): yes
# 2. Are all tests passing? (yes/no): yes
# 3. Has this been reviewed by another developer? (yes/no): yes
# 4. Is this a safe time to deploy (low traffic)? (yes/no): yes
```

---

## Database Migrations

### Understanding Migration Detection

The deploy scripts detect migrations by checking for changes in:
- `src/lib/schema.ts` - Drizzle schema definitions
- `drizzle/*.sql` - Generated migration files

### What Happens When Migrations Are Detected

**Staging:**
- Script lists changed files
- Asks if you want to review migration SQL
- Asks if you want to apply migrations
- If you skip, deployment continues with warning

**Production:**
- Script FORCES you to review migration content
- Asks if migration was tested on staging
- **BLOCKS deployment** if you answer "no"
- No way to skip migration review

### Manual Migration Commands

If you need to run migrations manually:

```bash
# Check pending migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Or run specific SQL file
psql 'postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/homa_staging' < drizzle/0005_some_migration.sql
```

---

## Rollback Procedures

### Automatic Rollback (Build/Health Check Failure)

If build fails or health check returns non-200, the script **automatically rolls back**:

```bash
# This happens automatically:
git reset --hard $PREVIOUS_COMMIT
npm install
npm run build
pm2 restart homa-staging
```

### Manual Rollback (After Successful Deploy)

If you discover issues after deployment:

#### 1. Code Rollback
```bash
cd /var/www/homa-staging  # or homa-production
git log --oneline -10     # Find previous commit hash

git reset --hard <COMMIT_HASH>
npm install
npm run build
pm2 restart homa-staging
```

#### 2. Database Rollback

Find backup created during deployment:
```bash
ls -lt /var/backups/homa-staging/
# Output: db_backup_20260309_143022.sql

# Restore database
psql 'postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/homa_staging' < /var/backups/homa-staging/db_backup_20260309_143022.sql
```

#### 3. Full Rollback (Code + Database)

```bash
# 1. Restore database first
psql 'postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/homa_staging' < /var/backups/homa-staging/db_backup_TIMESTAMP.sql

# 2. Revert code
cd /var/www/homa-staging
git reset --hard <PREVIOUS_COMMIT>
npm install
npm run build
pm2 restart homa-staging

# 3. Verify
curl -I https://staging.homa.co.id/api/health
pm2 logs homa-staging --lines 50
```

---

## Post-Deployment Verification

### Staging Checklist
```bash
# 1. Check PM2 status
pm2 list

# 2. Check application logs
pm2 logs homa-staging --lines 100

# 3. Test endpoints
curl https://staging.homa.co.id/api/health
curl https://staging.homa.co.id/api/packages

# 4. Manual browser test
# - Login at https://staging.homa.co.id/login
# - Navigate to key pages
# - Test main workflows
```

### Production Checklist
```bash
# 1. Monitor for 30 minutes after deploy
pm2 logs homa-production --lines 200

# 2. Check for errors
pm2 logs homa-production --err

# 3. Test critical paths
# [ ] Login functionality
# [ ] Customer creation
# [ ] Mitra assignment
# [ ] Attendance recording
# [ ] Payout calculation

# 4. Check database connections
psql 'postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/homa_production' -c "SELECT COUNT(*) FROM user_db;"

# 5. Monitor resource usage
htop
df -h
```

---

## Common Issues

### Issue 1: Migration Not Applied

**Symptom:** API returns 500 error about missing column

**Solution:**
```bash
cd /var/www/homa-staging
npm run db:migrate
pm2 restart homa-staging
```

### Issue 2: Build Succeeds but App Won't Start

**Symptom:** PM2 shows app in "errored" state

**Solution:**
```bash
# Check logs for actual error
pm2 logs homa-staging --err

# Common causes:
# - DATABASE_URL not set in .env
# - Port already in use
# - Node version mismatch
```

### Issue 3: Deployment Script Fails at Git Pull

**Symptom:** "Uncommitted changes detected"

**Solution:**
```bash
cd /var/www/homa-staging
git status

# If changes are intentional:
git stash

# If changes should not exist:
git reset --hard HEAD
```

### Issue 4: Health Check Fails (504 Gateway Timeout)

**Symptom:** Nginx returns 504

**Solution:**
```bash
# 1. Check if app is running
pm2 list

# 2. Check app logs
pm2 logs homa-staging --err

# 3. Restart app
pm2 restart homa-staging

# 4. If still fails, check Nginx
systemctl status nginx
tail -f /var/log/nginx/error.log
```

---

## Emergency Procedures

### Complete System Failure

If both staging and production are down:

```bash
# 1. Check VPS resources
htop
df -h

# 2. Restart PostgreSQL
systemctl restart postgresql

# 3. Restart Nginx
systemctl restart nginx

# 4. Restart both apps
pm2 restart all

# 5. Check logs
pm2 logs --lines 200
```

### Database Corruption

If database is corrupted:

```bash
# 1. Find latest good backup
ls -lt /var/backups/homa-production/

# 2. Stop app
pm2 stop homa-production

# 3. Drop and recreate database
psql 'postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/postgres' << 'EOF'
DROP DATABASE homa_production;
CREATE DATABASE homa_production;
GRANT ALL ON DATABASE homa_production TO homa_user;
EOF

# 4. Restore from backup
psql 'postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/homa_production' < /var/backups/homa-production/db_backup_LATEST.sql

# 5. Restart app
pm2 restart homa-production
```

---

## Deployment Schedule Best Practices

### Staging
- **Anytime** - Safe to deploy during business hours
- **Frequency** - Multiple times per day if needed
- **Testing window** - At least 2 hours before production deploy

### Production
- **Preferred time** - 10 PM - 6 AM WIB (low traffic)
- **Avoid** - Monday mornings, Friday evenings
- **Maximum frequency** - Once per day (unless critical hotfix)
- **Notification** - Inform users if deploy > 5 minutes downtime

---

## Script Maintenance

### Updating Deployment Scripts

If you modify the deployment scripts:

```bash
# 1. Test changes on staging first
cd /var/www/homa-staging
bash scripts/deploy-staging.sh

# 2. If successful, update production script
# 3. Document changes in this guide
```

### Making Scripts Executable

```bash
chmod +x scripts/deploy-staging.sh
chmod +x scripts/deploy-production.sh
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

```bash
# PM2 monitoring
pm2 monit

# Disk space (warn if < 20% free)
df -h

# Memory usage (warn if > 80%)
free -h

# Database connections
psql 'postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/homa_production' -c "SELECT count(*) FROM pg_stat_activity;"

# Error logs
pm2 logs homa-production --err --lines 50
```

### Setting Up Alerts (Future)

Consider setting up:
- PM2 Plus for monitoring (paid)
- Custom health check script with email alerts
- Uptime monitoring (UptimeRobot - free tier)

---

## Contact Information

**VPS Details:**
- IP: 194.233.68.67
- Provider: Contabo
- Access: SSH as root

**Domain:**
- Registrar: MyDomainesia
- Domain: homa.co.id
- Staging: staging.homa.co.id
- Production: internal.homa.co.id

**Support:**
- VPS Support: support@contabo.com
- Domain Support: MyDomainesia panel

---

**Remember:** When in doubt, test on staging first. Production data is irreplaceable.
