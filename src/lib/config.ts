// System Configuration Utilities
// Helper functions to get/set system config values

import { db } from './db';
import { systemConfigDB } from './schema';
import { eq } from 'drizzle-orm';

// Cache for config values (in-memory cache for performance)
const configCache = new Map<string, { value: any; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get a system config value by key
 * @param key - Config key (e.g., 'enable_mitra_region_filter')
 * @param defaultValue - Default value if config not found
 * @returns Promise<any> - Config value (parsed based on dataType)
 */
export async function getConfig(key: string, defaultValue: any = null): Promise<any> {
  try {
    // Check cache first
    const cached = configCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.value;
    }

    // Fetch from database
    const result = await db
      .select({
        configValue: systemConfigDB.configValue,
        dataType: systemConfigDB.dataType,
        isActive: systemConfigDB.isActive,
      })
      .from(systemConfigDB)
      .where(eq(systemConfigDB.configKey, key))
      .limit(1);

    if (result.length === 0 || !result[0].isActive) {
      return defaultValue;
    }

    const config = result[0];
    let parsedValue: any;

    // Parse value based on data type
    switch (config.dataType) {
      case 'boolean':
        parsedValue = config.configValue === 'true' || config.configValue === '1';
        break;
      case 'number':
        parsedValue = parseFloat(config.configValue);
        break;
      case 'json':
        parsedValue = JSON.parse(config.configValue);
        break;
      default:
        parsedValue = config.configValue;
    }

    // Update cache
    configCache.set(key, { value: parsedValue, timestamp: Date.now() });

    return parsedValue;
  } catch (error) {
    console.error(`Error getting config '${key}':`, error);
    return defaultValue;
  }
}

/**
 * Set a system config value
 * @param key - Config key
 * @param value - Config value (will be stringified)
 * @param updatedBy - User email who updated
 * @returns Promise<boolean> - Success status
 */
export async function setConfig(
  key: string,
  value: any,
  updatedBy: string = 'system'
): Promise<boolean> {
  try {
    // Convert value to string based on type
    let stringValue: string;
    let dataType: string;

    if (typeof value === 'boolean') {
      stringValue = value ? 'true' : 'false';
      dataType = 'boolean';
    } else if (typeof value === 'number') {
      stringValue = value.toString();
      dataType = 'number';
    } else if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
      dataType = 'json';
    } else {
      stringValue = String(value);
      dataType = 'string';
    }

    // Update or insert
    const existing = await db
      .select({ id: systemConfigDB.id })
      .from(systemConfigDB)
      .where(eq(systemConfigDB.configKey, key))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(systemConfigDB)
        .set({
          configValue: stringValue,
          dataType,
          updatedAt: new Date(),
          updatedBy,
        })
        .where(eq(systemConfigDB.configKey, key));
    } else {
      // Insert new
      await db.insert(systemConfigDB).values({
        configKey: key,
        configValue: stringValue,
        dataType,
        updatedBy,
      });
    }

    // Clear cache
    configCache.delete(key);

    return true;
  } catch (error) {
    console.error(`Error setting config '${key}':`, error);
    return false;
  }
}

/**
 * Clear config cache (use after bulk updates)
 */
export function clearConfigCache() {
  configCache.clear();
}

/**
 * Predefined config keys (for type safety)
 */
export const CONFIG_KEYS = {
  // Mitra Assignment (Feedback 2a)
  ENABLE_MITRA_REGION_FILTER: 'enable_mitra_region_filter',

  // Schedule Restrictions (Feedback 2b)
  ENABLE_SCHEDULE_MAX_HOURS: 'enable_schedule_max_hours',

  // Historical Visits Lock (Feedback 6b)
  LOCK_COMPLETED_VISITS: 'lock_completed_visits',
} as const;
