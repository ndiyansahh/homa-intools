# HOMA Database Setup Guide

## Prerequisites

1. **PostgreSQL** installed and running
2. **Node.js** 18+ and npm/yarn
3. **Database user** with creation privileges

## Quick Setup

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Environment Configuration

Copy and configure your environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your database credentials:

```env
# Database Configuration
DATABASE_URL=postgresql://neondb_owner:npg_Fveo92tcXWNa@ep-winter-field-a18c0zs9-pooler.ap-southeast-1.aws.neon.tech/homa_staging?sslmode=require
```

### 3. Create Database

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database and user
CREATE DATABASE homa_db;
CREATE USER homa_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE homa_db TO homa_user;
```

### 4. Initialize Schema

#### Option A: Using SQL Script (Recommended)
```bash
# Run the initialization script
psql -U homa_user -d homa_db -f sql/init.sql
```

#### Option B: Using API Endpoint
```bash
# Start the application first
npm run dev

# Then call the API (requires ADMIN/OWNER login)
curl -X POST http://localhost:3000/api/db/migrate \
  -H "Content-Type: application/json" \
  -d '{"action": "init"}'
```

### 5. Seed Master Data

```bash
# Run seed script
npm run db:seed
```

### 6. Test Connection

```bash
# Test database connectivity
curl http://localhost:3000/api/db/test
```

## Database Schema

### Tables Overview

| Table | Description | Records |
|-------|-------------|---------|
| `region_db` | Master data for regions/locations | ~50-100 |
| `subscription_package_db` | Available cleaning packages | ~10-20 |
| `customer_db` | Customer information and subscriptions | Growing |
| `mitra_db` | Cleaners and partners | ~50-200 |
| `invoice_db` | Customer invoices | Growing |
| `attendance_schedule_db` | Scheduled cleaning visits | Growing |
| `attendance_record_db` | Completed visit records | Growing |
| `mitra_payout_db` | Partner payment records | Growing |

### Key Features

- **UUID Primary Keys** for all tables
- **Auto-updating timestamps** via triggers
- **Data validation** with CHECK constraints
- **Soft deletes** with `is_deleted` flags
- **Optimized indexes** for common queries
- **Auto-calculation triggers** for totals
- **Referential integrity** with foreign keys

## Database Scripts

### Available NPM Scripts

```bash
# Generate Drizzle migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with master data
npm run db:seed

# Open Drizzle Studio (GUI)
npm run db:studio
```

### Manual SQL Operations

```bash
# Connect to database
psql -U homa_user -d homa_db

# View table structure
\dt
\d+ customer_db

# Check data
SELECT COUNT(*) FROM customer_db;
SELECT * FROM subscription_package_db;
```

## API Endpoints

### Database Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/db/test` | GET | Test database connection |
| `/api/db/migrate` | GET | Check migration status |
| `/api/db/migrate` | POST | Initialize or migrate database |

### Example API Calls

```bash
# Test connection
curl http://localhost:3000/api/db/test

# Check migration status
curl http://localhost:3000/api/db/migrate

# Initialize database (requires auth)
curl -X POST http://localhost:3000/api/db/migrate \
  -H "Content-Type: application/json" \
  -d '{"action": "init"}'

# Seed data (requires auth)
curl -X POST http://localhost:3000/api/db/migrate \
  -H "Content-Type: application/json" \
  -d '{"action": "seed"}'
```

## Troubleshooting

### Common Issues

1. **Connection refused**
   ```bash
   # Check PostgreSQL is running
   sudo service postgresql status
   
   # Start PostgreSQL
   sudo service postgresql start
   ```

2. **Permission denied**
   ```sql
   -- Grant permissions to user
   GRANT ALL PRIVILEGES ON DATABASE homa_db TO homa_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO homa_user;
   ```

3. **SSL connection issues**
   ```env
   # Disable SSL for local development
   DATABASE_URL="postgresql://user:pass@localhost:5432/homa_db?sslmode=disable"
   ```

4. **Port conflicts**
   ```bash
   # Check what's running on port 5432
   sudo netstat -tulpn | grep 5432
   
   # Use different port if needed
   DATABASE_URL="postgresql://user:pass@localhost:5433/homa_db"
   ```

### Logs and Debugging

```bash
# Enable detailed logging
export DEBUG=drizzle:*
npm run dev

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## Production Considerations

### Environment Variables

```env
# Production database with SSL
DATABASE_URL="postgresql://user:pass@prod-host:5432/homa_db?sslmode=require"

# Connection pool settings
DB_POOL_MIN=5
DB_POOL_MAX=50
DB_POOL_IDLE_TIMEOUT=30000
```

### Security

1. **Use strong passwords** for database users
2. **Enable SSL** for remote connections
3. **Restrict network access** with firewall rules
4. **Regular backups** with pg_dump
5. **Monitor connections** and query performance

### Backup Strategy

```bash
# Create backup
pg_dump -U homa_user -h localhost homa_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -U homa_user -d homa_db_new -f backup_20250118_120000.sql
```

## Next Steps

After database setup:

1. ✅ Database connection established
2. ✅ Schema initialized
3. ✅ Master data seeded
4. 🔄 Update existing API endpoints to use PostgreSQL
5. 🔄 Implement data validation with Drizzle schemas
6. 🔄 Add database-driven authentication
7. 🔄 Create reporting and analytics queries

## Support

For issues or questions:
- Check the troubleshooting section above
- Review PostgreSQL logs
- Test connection with `/api/db/test` endpoint
- Verify environment variables are correctly set