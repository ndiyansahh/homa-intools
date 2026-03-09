#!/bin/bash
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}========================================${NC}"
echo -e "${RED}  HOMA PRODUCTION Deployment Script${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Configuration
APP_DIR="/var/www/homa-production"
APP_NAME="homa-production"
BRANCH="main"
DB_URL="postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/homa_production"

# ⚠️ PRODUCTION SAFETY CHECKS
echo -e "${RED}⚠️  WARNING: This is a PRODUCTION deployment!${NC}"
echo -e "${YELLOW}This will affect live customer data and real business operations.${NC}"
echo ""
read -p "Type 'DEPLOY TO PRODUCTION' to continue: " confirm
if [ "$confirm" != "DEPLOY TO PRODUCTION" ]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi
echo ""

# Check if staging is stable
echo -e "${YELLOW}Pre-deployment checklist:${NC}"
read -p "1. Has this been tested on staging? (yes/no): " staging_tested
read -p "2. Are all tests passing? (yes/no): " tests_pass
read -p "3. Has this been reviewed by another developer? (yes/no): " reviewed
read -p "4. Is this a safe time to deploy (low traffic)? (yes/no): " safe_time

if [[ "$staging_tested" != "yes" || "$tests_pass" != "yes" || "$reviewed" != "yes" || "$safe_time" != "yes" ]]; then
    echo -e "${RED}✗ Pre-deployment checklist failed. Deployment cancelled.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Pre-deployment checklist passed${NC}"
echo ""

# Step 1: Backup current version
echo -e "${YELLOW}[1/8] Creating backup...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/homa-production"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump "$DB_URL" > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo -e "${GREEN}✓ Database backed up to: $BACKUP_DIR/db_backup_$TIMESTAMP.sql${NC}"

# Backup .env
cp $APP_DIR/.env $BACKUP_DIR/.env_$TIMESTAMP
echo -e "${GREEN}✓ Environment file backed up${NC}"

# Step 2: Check for uncommitted changes
echo -e "${YELLOW}[2/8] Checking git status...${NC}"
cd $APP_DIR
if [[ $(git status --porcelain) ]]; then
    echo -e "${RED}✗ Error: Uncommitted changes detected in production!${NC}"
    git status --short
    echo -e "${RED}This should never happen. Deployment cancelled.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git status clean${NC}"

# Step 3: Pull latest code
echo -e "${YELLOW}[3/8] Pulling latest code from $BRANCH...${NC}"
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
git pull origin $BRANCH
NEW_COMMIT=$(git rev-parse HEAD)

if [ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]; then
    echo -e "${YELLOW}⚠ No new commits. Already up to date.${NC}"
    read -p "Continue anyway? (yes/no): " continue
    if [ "$continue" != "yes" ]; then
        echo -e "${RED}Deployment cancelled.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Updated from $CURRENT_COMMIT to $NEW_COMMIT${NC}"
    echo ""
    echo -e "${YELLOW}Commit log:${NC}"
    git log --oneline $CURRENT_COMMIT..$NEW_COMMIT
    echo ""
    read -p "Review changes before continuing? (yes/no): " review_changes
    if [ "$review_changes" == "yes" ]; then
        git diff $CURRENT_COMMIT $NEW_COMMIT --stat
    fi
    echo ""
fi

# Step 4: Install dependencies
echo -e "${YELLOW}[4/8] Checking for dependency changes...${NC}"
if git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -q "package.json\|package-lock.json"; then
    echo -e "${YELLOW}Dependencies changed. Running npm install...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies updated${NC}"
else
    echo -e "${GREEN}✓ No dependency changes${NC}"
fi

# Step 5: Check for migrations
echo -e "${YELLOW}[5/8] Checking for database migrations...${NC}"
if git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -q "drizzle/\|src/lib/schema.ts"; then
    echo -e "${RED}⚠️  CRITICAL: Schema or migration changes detected!${NC}"
    echo -e "${YELLOW}Changed files:${NC}"
    git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -E "drizzle/|src/lib/schema.ts"
    echo ""

    # MANDATORY review for production
    echo -e "${YELLOW}Latest migration files:${NC}"
    ls -lt drizzle/*.sql | head -5
    echo ""
    read -p "Enter migration filename to review (required): " migration_file
    if [ -z "$migration_file" ]; then
        echo -e "${RED}✗ Migration review is mandatory for production. Deployment cancelled.${NC}"
        exit 1
    fi
    echo ""
    echo -e "${YELLOW}Migration content:${NC}"
    cat "drizzle/$migration_file"
    echo ""

    read -p "Has this migration been tested on staging with real data? (yes/no): " migration_tested
    if [ "$migration_tested" != "yes" ]; then
        echo -e "${RED}✗ Untested migrations cannot be deployed to production. Deployment cancelled.${NC}"
        exit 1
    fi

    read -p "Apply migrations now? (yes/no): " apply
    if [ "$apply" == "yes" ]; then
        npm run db:migrate
        echo -e "${GREEN}✓ Migrations applied${NC}"
    else
        echo -e "${RED}✗ Migrations must be applied. Deployment cancelled.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ No migration changes${NC}"
fi

# Step 6: Build application
echo -e "${YELLOW}[6/8] Building application...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    echo -e "${YELLOW}Rolling back to previous version...${NC}"
    git reset --hard $CURRENT_COMMIT
    npm install
    npm run build
    pm2 restart $APP_NAME
    echo -e "${RED}Deployment failed. Rolled back to $CURRENT_COMMIT${NC}"
    exit 1
fi

# Step 7: Restart PM2
echo -e "${YELLOW}[7/8] Restarting application...${NC}"
pm2 restart $APP_NAME
sleep 5  # Longer wait for production

# Step 8: Health check
echo -e "${YELLOW}[8/8] Running health checks...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://internal.homa.co.id/api/health || echo "000")

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP $HTTP_STATUS)${NC}"

    # Additional production checks
    echo -e "${YELLOW}Running additional checks...${NC}"

    # Check login endpoint
    LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://internal.homa.co.id/login || echo "000")
    if [ "$LOGIN_STATUS" == "200" ]; then
        echo -e "${GREEN}✓ Login page accessible${NC}"
    else
        echo -e "${RED}✗ Login page check failed (HTTP $LOGIN_STATUS)${NC}"
    fi

    # Check API packages endpoint
    PACKAGES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://internal.homa.co.id/api/packages || echo "000")
    if [ "$PACKAGES_STATUS" == "200" ]; then
        echo -e "${GREEN}✓ API endpoints accessible${NC}"
    else
        echo -e "${RED}✗ API check failed (HTTP $PACKAGES_STATUS)${NC}"
    fi

else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_STATUS)${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    git reset --hard $CURRENT_COMMIT
    npm install
    npm run build
    pm2 restart $APP_NAME
    echo -e "${RED}Deployment failed. Rolled back to $CURRENT_COMMIT${NC}"
    exit 1
fi

# Success summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  PRODUCTION Deployment Successful! ✓${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Previous commit: ${YELLOW}$CURRENT_COMMIT${NC}"
echo -e "New commit:      ${GREEN}$NEW_COMMIT${NC}"
echo -e "Backup location: ${YELLOW}$BACKUP_DIR/db_backup_$TIMESTAMP.sql${NC}"
echo -e "App URL:         ${GREEN}https://internal.homa.co.id${NC}"
echo ""
echo -e "${YELLOW}Monitor the application for the next 30 minutes.${NC}"
echo -e "${YELLOW}To rollback, run:${NC}"
echo -e "  psql '$DB_URL' < $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo -e "  cd $APP_DIR && git reset --hard $CURRENT_COMMIT && npm install && npm run build && pm2 restart $APP_NAME"
echo ""
echo -e "${YELLOW}Post-deployment checklist:${NC}"
echo -e "  [ ] Test login functionality"
echo -e "  [ ] Test customer creation"
echo -e "  [ ] Test attendance recording"
echo -e "  [ ] Check error logs: pm2 logs $APP_NAME --lines 100"
echo ""
