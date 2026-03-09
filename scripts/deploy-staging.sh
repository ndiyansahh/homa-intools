#!/bin/bash
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  HOMA Staging Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
APP_DIR="/var/www/homa-staging"
APP_NAME="homa-staging"
BRANCH="staging"
DB_URL="postgresql://homa_user:HomaDB@2025!Secure@localhost:5432/homa_staging"

# Step 1: Backup current version
echo -e "${YELLOW}[1/8] Creating backup...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/homa-staging"
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
    echo -e "${RED}✗ Warning: Uncommitted changes detected!${NC}"
    git status --short
    read -p "Continue anyway? (yes/no): " continue
    if [ "$continue" != "yes" ]; then
        echo -e "${RED}Deployment cancelled.${NC}"
        exit 1
    fi
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
else
    echo -e "${GREEN}✓ Updated from $CURRENT_COMMIT to $NEW_COMMIT${NC}"
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
    echo -e "${YELLOW}⚠ Schema or migration changes detected!${NC}"
    echo -e "${YELLOW}Changed files:${NC}"
    git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -E "drizzle/|src/lib/schema.ts"

    read -p "Review migrations before applying? (yes/no): " review
    if [ "$review" == "yes" ]; then
        echo -e "${YELLOW}Latest migration files:${NC}"
        ls -lt drizzle/*.sql | head -5
        read -p "Show migration content? (filename or 'skip'): " show_file
        if [ "$show_file" != "skip" ]; then
            cat "drizzle/$show_file"
        fi
    fi

    read -p "Apply migrations now? (yes/no): " apply
    if [ "$apply" == "yes" ]; then
        npm run db:migrate
        echo -e "${GREEN}✓ Migrations applied${NC}"
    else
        echo -e "${RED}✗ Migrations skipped. App may not work correctly!${NC}"
        read -p "Continue deployment? (yes/no): " continue
        if [ "$continue" != "yes" ]; then
            echo -e "${RED}Deployment cancelled.${NC}"
            exit 1
        fi
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
sleep 3

# Step 8: Health check
echo -e "${YELLOW}[8/8] Running health check...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.homa.co.id/api/health || echo "000")

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP $HTTP_STATUS)${NC}"
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
echo -e "${GREEN}  Deployment Successful! ✓${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Previous commit: ${YELLOW}$CURRENT_COMMIT${NC}"
echo -e "New commit:      ${GREEN}$NEW_COMMIT${NC}"
echo -e "Backup location: ${YELLOW}$BACKUP_DIR/db_backup_$TIMESTAMP.sql${NC}"
echo -e "App URL:         ${GREEN}https://staging.homa.co.id${NC}"
echo ""
echo -e "${YELLOW}To rollback, run:${NC}"
echo -e "  psql '$DB_URL' < $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo -e "  cd $APP_DIR && git reset --hard $CURRENT_COMMIT && npm install && npm run build && pm2 restart $APP_NAME"
echo ""
