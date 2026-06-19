// Simple logger utility for audit events (client-safe)

import { db } from '@/lib/db'
import { botUserDB } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

export interface AuditEvent {
  action: string;
  userId?: string;
  email?: string;
  details?: any;
  timestamp?: Date;
}

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(message: string): Promise<void> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch {
    // Silently fail — don't crash the app if Telegram is unreachable
  }
}

// Kirim pesan ke specific chat ID
export async function sendTelegramToUser(chatId: string, message: string): Promise<void> {
  if (!TELEGRAM_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch {
    // Silently fail — don't crash the app if Telegram is unreachable
  }
}

// Broadcast ke semua active reporters di bot_user_db
export async function broadcastToUsers(message: string): Promise<number> {
  if (!TELEGRAM_TOKEN) return 0;
  try {
    const users = await db
      .select({ chatId: botUserDB.chatId })
      .from(botUserDB)
      .where(and(eq(botUserDB.isActive, true), eq(botUserDB.role, 'reporter')));

    await Promise.all(users.map((u) => sendTelegramToUser(u.chatId, message)));
    return users.length;
  } catch {
    return 0;
  }
}

export async function logApiError(params: {
  method: string;
  endpoint: string;
  status: number;
  error: string;
  email?: string;
  body?: any;
}): Promise<void> {
  const { method, endpoint, status, error, email, body } = params;
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  console.error(`[API ERROR] ${method} ${endpoint} → ${status}`, { error, email, body });

  if (process.env.NODE_ENV === 'production') {
    const message = [
      `🚨 *HOMA API Error*`,
      `*Endpoint:* \`${method} ${endpoint}\``,
      `*Status:* \`${status}\``,
      `*Error:* ${error}`,
      email ? `*User:* ${email}` : null,
      body ? `*Body:* \`${JSON.stringify(body).slice(0, 200)}\`` : null,
      `*Time:* ${timestamp} WIB`,
    ].filter(Boolean).join('\n');

    await sendTelegram(message);
  }
}

export function logAuditEvent(event: AuditEvent): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }
}

export function logAuthEvent(event: AuditEvent): void {
  logAuditEvent({ ...event, action: `auth_${event.action}` });
}

export function logNavigationEvent(event: AuditEvent): void {
  logAuditEvent({ ...event, action: `nav_${event.action}` });
}