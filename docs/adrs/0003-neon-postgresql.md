# ADR 0003: Use Neon PostgreSQL for Database

**Date:** 2025-12-08  
**Status:** ✅ Accepted  
**Deciders:** Handi, Team  
**Tags:** database, postgresql, serverless, hosting

---

## Context

We needed to choose a PostgreSQL hosting solution for the HOMA project. The application requires:
- PostgreSQL database (not negotiable - needed for complex queries)
- Asia/Jakarta timezone support
- Reasonable performance
- Easy deployment
- Low/predictable cost for MVP stage
- Good developer experience

**Main Options:**
1. Neon (serverless PostgreSQL)
2. Supabase (PostgreSQL + extras)
3. Railway (traditional VPS with PostgreSQL)
4. Self-hosted PostgreSQL on VPS
5. AWS RDS (managed PostgreSQL)

---

## Decision

We chose **Neon PostgreSQL** (serverless PostgreSQL).

**Key Features Used:**
- Serverless PostgreSQL with branching
- Generous free tier (5GB storage, 10GB data transfer)
- Auto-scaling connections
- Point-in-time restore
- Great Drizzle ORM integration

---

## Consequences

### Positive ✅

**1. Serverless Benefits**
- **Auto-scaling:** Scales to zero when not in use
- **Cost-effective:** Only pay for compute time used
- **No server management:** No VPS to maintain
- **Instant provisioning:** Database ready in seconds

**2. Database Branching** 🔥
```bash
# Create branch for testing
neon branches create staging

# Test migrations safely
drizzle-kit push --branch=staging

# Merge to main when ready
neon branches merge staging
```
**Use Cases:**
- Test migrations before production
- Dev/staging/production isolation
- Safe schema experiments

**3. Great Developer Experience**
- Simple connection string
- Works perfectly with Drizzle ORM
- Built-in pgvector support (for future AI features)
- Web dashboard for quick queries

**4. Performance**
- Fast cold starts (~100-300ms)
- Connection pooling included
- Good for Next.js serverless functions
- No connection limit issues

**5. Cost**
**Free Tier Includes:**
- 5GB storage
- 10GB data transfer/month
- Compute: 100 hours/month
- 1 project, unlimited branches

**Paid Tier ($20/month):**
- 50GB storage
- 100GB data transfer
- Unlimited compute
- More projects

**Current Status:** Free tier sufficient for MVP

**6. Backup & Recovery**
- Automatic backups
- Point-in-time restore (last 7 days)
- Easy rollback if issues

---

### Negative ⚠️

**1. Cold Starts**
- First query after idle: 100-300ms
- Not ideal for ultra-low latency apps
- **Mitigation:** Acceptable for internal tool

**2. Region Limitations**
- Primary regions: US, EU
- No Asia/Jakarta region yet
- **Impact:** ~100-200ms latency from Indonesia
- **Mitigation:** Still acceptable for internal tool

**3. PostgreSQL Version**
- Currently Postgres 15
- Can't choose specific minor version
- **Impact:** Low - Postgres 15 has all features we need

**4. Less Control**
- Can't install custom extensions easily
- Can't tune PostgreSQL config deeply
- **Impact:** Low - default config works well

**5. Vendor Lock-in**
- Somewhat locked to Neon's ecosystem
- **Mitigation:** Standard PostgreSQL, easy to export/migrate

---

## Alternatives Considered

### Supabase
**Pros:**
- PostgreSQL + Auth + Storage + Realtime
- Great free tier
- Beautiful dashboard
- Auth built-in
- Edge functions included

**Cons:**
- We don't need auth (we built custom JWT)
- We don't need realtime
- We don't need storage (yet)
- Extra features = unnecessary complexity
- Heavier stack

**Why Rejected:**
Too many features we don't need. We only want PostgreSQL.

---

### Railway
**Pros:**
- Traditional VPS-style PostgreSQL
- Predictable performance (no cold starts)
- Can run other services alongside
- Good for monolithic apps
- Easy Redis, etc.

**Cons:**
- Costs more ($5 minimum + usage)
- Always-on compute (no scale-to-zero)
- Need to manage server resources
- No database branching

**Why Rejected:**
More expensive for our usage pattern. We value scale-to-zero.

---

### Self-Hosted (VPS)
**Pros:**
- Maximum control
- Cheapest long-term (if you have skills)
- Can optimize everything
- No vendor lock-in
- Choose exact region

**Cons:**
- Need to manage server
- Security responsibility
- Backup management
- Monitoring setup
- Update management
- DevOps overhead

**Why Rejected:**
Time > money at MVP stage. Don't want DevOps burden.

---

### AWS RDS
**Pros:**
- Enterprise-grade
- Multiple regions including Asia
- Deep integration with AWS services
- Multi-AZ for HA
- Mature and stable

**Cons:**
- **Expensive** ($20-50+/month minimum)
- Complex pricing (compute + storage + IOPS + backup)
- Overkill for MVP
- Requires AWS knowledge
- No scale-to-zero

**Why Rejected:**
Way too expensive for early-stage project.

---

## Implementation Details

### Connection Setup

**Environment Variables:**
```bash
# .env.local
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
```

**Drizzle Config:**
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
});
```

**Database Connection:**
```typescript
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client);
```

---

### Database Branching Workflow

**Development:**
```bash
# Create dev branch
neon branches create dev

# Connect to dev branch
export DATABASE_URL="postgresql://...dev-branch..."

# Run migrations
drizzle-kit push

# Test changes
npm run dev
```

**Staging:**
```bash
# Create staging branch
neon branches create staging

# Deploy to staging with staging branch URL
```

**Production:**
```bash
# Merge staging to main
neon branches merge staging

# Deploy to production
```

---

### Backup Strategy

**Automatic Backups:**
- Neon: Automatic continuous backups
- Point-in-time restore: Last 7 days
- Free tier: 7-day retention
- Paid tier: 30-day retention

**Manual Backups (Critical Data):**
```bash
# Export to SQL file
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Store in S3 or Git (if small)
```

---

### Migration Strategy

**Schema Changes:**
```bash
# 1. Make schema changes in code
# drizzle/schema.ts

# 2. Generate migration
drizzle-kit generate:pg

# 3. Review migration SQL
# drizzle/migrations/0001_xxx.sql

# 4. Test in branch
drizzle-kit push --branch=staging

# 5. Deploy to production
drizzle-kit push
```

---

## Cost Projection

### Current (MVP - Free Tier)
- **Storage:** 2GB used / 5GB limit
- **Compute:** 20 hours/month used / 100 hours limit
- **Cost:** $0/month ✅

### Expected Growth (6 months)
- **Storage:** 10GB
- **Compute:** 200 hours/month
- **Need:** Paid tier ($20/month)

### 1 Year Projection
- **Storage:** 30GB
- **Compute:** 400 hours/month
- **Cost:** $20-40/month

**Still Way Cheaper Than:**
- AWS RDS: $50-100/month
- Railway: $30-50/month
- Self-hosted: $10/month (but + time cost)

---

## Performance Metrics

**Measured Performance (Indonesia):**
- Cold start: 150-250ms
- Warm query: 10-50ms
- Connection time: 50-100ms
- Average response: 50-150ms

**Acceptable for:**
- Internal management tool ✅
- Admin dashboards ✅
- Batch processing ✅

**Not ideal for:**
- Public-facing high-traffic apps
- Real-time gaming
- Ultra-low latency APIs

---

## Risk Assessment

### Technical Risks

**1. Region Latency** 🟡 Medium
- **Risk:** No Asia region, 100-200ms latency
- **Mitigation:** Acceptable for internal tool
- **Future:** Neon may add Asia regions

**2. Cold Starts** 🟡 Medium
- **Risk:** First query slow after idle
- **Mitigation:** Cron job to keep warm
- **Impact:** Only affects first user of the day

**3. Vendor Lock-in** 🟢 Low
- **Risk:** Tied to Neon ecosystem
- **Mitigation:** Standard PostgreSQL, easy export
- **Escape Plan:** Can migrate to any PostgreSQL provider

### Business Risks

**1. Pricing Changes** 🟢 Low
- **Risk:** Neon increases prices
- **Impact:** Still cheaper than alternatives
- **Mitigation:** Can migrate if needed

**2. Service Downtime** 🟢 Low
- **Risk:** Neon outage
- **Historical:** 99.9% uptime
- **Mitigation:** Accept risk for MVP

---

## Migration Plan (If Needed)

**Exit Strategy:**
```bash
# 1. Export data
pg_dump $NEON_DATABASE_URL > full_backup.sql

# 2. Create new PostgreSQL instance (Railway, Supabase, etc.)
# 3. Import data
psql $NEW_DATABASE_URL < full_backup.sql

# 4. Update DATABASE_URL
# 5. Deploy
```

**Migration Effort:** 2-4 hours  
**Data Loss Risk:** Low (if done carefully)

---

## Related Decisions

- **ADR 0001:** Use Drizzle ORM (works great with Neon)
- **ADR 0005:** Asia/Jakarta Timezone Handling (needed due to Neon server timezone)

---

## References

- Neon Docs: https://neon.tech/docs
- Neon Branching: https://neon.tech/docs/guides/branching
- Pricing: https://neon.tech/pricing
- Drizzle + Neon Guide: https://orm.drizzle.team/docs/get-started-postgresql

---

## Review

**Next Review:** 2026-06-01  
**Metrics to Track:**
- Monthly cost
- Average query latency
- Storage growth
- Compute hours used

**Reassess If:**
- Cost exceeds $50/month
- Latency becomes problematic (>500ms p95)
- Need features Neon doesn't provide

---

**Last Updated:** 2025-12-08  
**Author:** Handi