import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false' ? {
    rejectUnauthorized: process.env.DB_SSL_MODE === 'require'
  } : false,
});

// Initialize Drizzle ORM
export const db = drizzle(pool, { schema });

// Connection health check
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), version()');
    client.release();
    
    return {
      success: true,
      timestamp: result.rows[0].now,
      version: result.rows[0].version,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    };
  } catch (error) {
    console.error('Database connection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Graceful shutdown
export async function closeConnection() {
  await pool.end();
}

// Export pool for direct queries if needed
export { pool };