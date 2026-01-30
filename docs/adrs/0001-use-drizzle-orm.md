# ADR 0001: Use Drizzle ORM Instead of Prisma

**Date:** 2025-12-01  
**Status:** ✅ Accepted  
**Deciders:** Handi, Team  
**Tags:** database, orm, typescript

---

## Context

We needed to choose an ORM for the HOMA project to interact with PostgreSQL database. The main candidates were:
- Prisma (most popular Node.js ORM)
- Drizzle ORM (newer, TypeScript-first)
- TypeORM (older, established)
- Raw SQL (no ORM)

**Requirements:**
- Type-safe database queries
- Good TypeScript support
- Migration management
- Performance (no heavy overhead)
- Good developer experience
- Small bundle size (for Next.js)

---

## Decision

We chose **Drizzle ORM** over Prisma.

**Key Reasons:**
1. **Lighter weight** - Smaller runtime, no query engine binary
2. **Pure TypeScript** - No code generation step (Prisma requires `prisma generate`)
3. **SQL-like syntax** - Easier for team familiar with SQL
4. **Better performance** - No client-server architecture overhead
5. **Migration control** - Direct SQL migrations, more control

---

## Consequences

### Positive ✅

**1. Better Performance**
- No Prisma Client engine overhead
- Direct SQL execution
- Smaller bundle size (~10x smaller than Prisma)

**2. Developer Experience**
```typescript
// Drizzle - SQL-like, intuitive
const customers = await db.query.customers.findMany({
  where: eq(customers.type, 'subscription'),
  with: { mitra: true }
});

// vs Prisma
const customers = await prisma.customer.findMany({
  where: { type: 'subscription' },
  include: { mitra: true }
});
```

**3. TypeScript-First**
- Schema defined in TypeScript
- No code generation step
- Type inference works perfectly
- Faster development cycle (no `prisma generate`)

**4. Flexible Migrations**
```sql
-- Direct SQL control
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ...
);
```

**5. Serverless-Friendly**
- No binary dependencies
- Works well with Vercel, Railway, etc.
- Cold start times faster

---

### Negative ⚠️

**1. Smaller Community**
- Prisma has 10x more users
- Fewer Stack Overflow answers
- Less third-party tooling

**2. Less Mature Ecosystem**
- Drizzle Studio still in development
- Some edge cases less documented
- Admin UI not as polished as Prisma Studio

**3. Learning Curve**
- Team needs to learn new syntax
- Different mental model from Prisma
- Less examples/tutorials available

**4. No Visual Schema Designer**
- Prisma has better visual tools
- Drizzle relies on code-first approach

---

## Alternatives Considered

### Prisma
**Pros:**
- Most popular ORM in Node.js ecosystem
- Excellent documentation
- Great admin UI (Prisma Studio)
- Large community support
- Many integrations

**Cons:**
- Heavy (includes query engine binary)
- Code generation step required
- Client-server architecture overhead
- Larger bundle size
- Less control over SQL

**Why Rejected:** Performance overhead not worth it for our use case. We value control and speed.

---

### TypeORM
**Pros:**
- Mature and stable
- Decorator-based syntax
- Large community
- Many examples

**Cons:**
- Older architecture
- Poor TypeScript inference
- Complex for simple queries
- Decorator syntax not ideal for Next.js

**Why Rejected:** Worse TypeScript support than both Prisma and Drizzle.

---

### Raw SQL (No ORM)
**Pros:**
- Maximum control
- Best performance
- No abstraction layer
- Direct PostgreSQL features

**Cons:**
- No type safety
- Manual query building
- Migration management harder
- More boilerplate code
- Error-prone

**Why Rejected:** Type safety too important for this project. Risk of SQL injection and type mismatches.

---

## Implementation Details

### Setup
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### Schema Definition
```typescript
// drizzle/schema.ts
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  // ...
});
```

### Usage
```typescript
// Query
import { db } from '@/lib/db';
import { customers } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

const customer = await db.query.customers.findFirst({
  where: eq(customers.id, 123)
});
```

### Migrations
```bash
# Generate migration
drizzle-kit generate:pg

# Push to database
drizzle-kit push:pg
```

---

## Related Decisions

- **ADR 0003:** Use Neon PostgreSQL (Drizzle works great with Neon)
- **ADR 0005:** Asia/Jakarta Timezone Handling (Drizzle's SQL control helps)

---

## References

- Drizzle ORM Docs: https://orm.drizzle.team/
- Prisma vs Drizzle Comparison: https://orm.drizzle.team/docs/prisma-to-drizzle
- Performance Benchmarks: https://github.com/drizzle-team/drizzle-benchmarks

---

## Review

**Review Date:** 2026-06-01 (6 months)  
**Outcome:** Continue with Drizzle or reassess?

---

**Last Updated:** 2025-12-01  
**Author:** Handi