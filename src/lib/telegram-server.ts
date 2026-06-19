'use server'

import { db } from '@/lib/db'
import { botUserDB } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { sendTelegramToUser } from '@/lib/logger'

export async function broadcastToUsers(message: string): Promise<number> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return 0;
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
