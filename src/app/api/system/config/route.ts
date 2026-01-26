import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConfig, setConfig, CONFIG_KEYS } from '@/lib/config';
import { db } from '@/lib/db';
import { systemConfigDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/logger';

// GET - Get all system configs or a specific config
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can view
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const configKey = searchParams.get('key');

    if (configKey) {
      // Get specific config
      const value = await getConfig(configKey);
      return NextResponse.json({
        success: true,
        data: {
          key: configKey,
          value,
        },
      });
    }

    // Get all configs
    const configs = await db
      .select()
      .from(systemConfigDB)
      .where(eq(systemConfigDB.isActive, true));

    // Parse values
    const parsedConfigs = configs.map(config => {
      let value: any;
      switch (config.dataType) {
        case 'boolean':
          value = config.configValue === 'true' || config.configValue === '1';
          break;
        case 'number':
          value = parseFloat(config.configValue);
          break;
        case 'json':
          value = JSON.parse(config.configValue);
          break;
        default:
          value = config.configValue;
      }

      return {
        id: config.id,
        key: config.configKey,
        value,
        dataType: config.dataType,
        description: config.description,
        category: config.category,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
      };
    });

    return NextResponse.json({
      success: true,
      data: parsedConfigs,
    });

  } catch (error) {
    console.error('Get system config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a config value
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can update
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({
        error: 'Config key is required'
      }, { status: 400 });
    }

    if (value === undefined || value === null) {
      return NextResponse.json({
        error: 'Config value is required'
      }, { status: 400 });
    }

    // Get old value for audit
    const oldValue = await getConfig(key);

    // Update config
    const success = await setConfig(key, value, session?.email || 'system');

    if (!success) {
      return NextResponse.json({
        error: 'Failed to update config'
      }, { status: 500 });
    }

    // Log audit event
    if (session) {
      await logAuditEvent({
        action: 'SYSTEM_CONFIG_UPDATED',
        userId: session.userId,
        email: session.email,
        details: {
          configKey: key,
          oldValue,
          newValue: value,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Config updated successfully',
      data: {
        key,
        value,
      },
    });

  } catch (error) {
    console.error('Update system config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new config (for future use)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can create
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value, description, category } = body;

    if (!key || value === undefined) {
      return NextResponse.json({
        error: 'Config key and value are required'
      }, { status: 400 });
    }

    // Set config (will create if not exists)
    const success = await setConfig(key, value, session?.email || 'system');

    if (!success) {
      return NextResponse.json({
        error: 'Failed to create config'
      }, { status: 500 });
    }

    // Log audit event
    if (session) {
      await logAuditEvent({
        action: 'SYSTEM_CONFIG_CREATED',
        userId: session.userId,
        email: session.email,
        details: {
          configKey: key,
          value,
          description,
          category,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Config created successfully',
      data: {
        key,
        value,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create system config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
