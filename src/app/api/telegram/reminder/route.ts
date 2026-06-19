// GET /api/telegram/reminder
// Cek ticket yang sudah lama belum resolved, kirim reminder ke admin.
// Dipanggil oleh cron job — dilindungi dengan x-cron-secret header.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ticketDB } from '@/lib/schema'
import { inArray, lt, sql } from 'drizzle-orm'
import { sendTelegramToUser } from '@/lib/logger'

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET

const PRIORITY_EMOJI: Record<string, string> = {
  High: '🔴',
  Medium: '🟡',
  Low: '🟢',
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Protect dengan secret header
  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!ADMIN_CHAT_ID) {
    return NextResponse.json({ error: 'TELEGRAM_CHAT_ID not configured' }, { status: 500 })
  }

  try {
    // Ticket Open/In Progress yang dibuat lebih dari 4 jam lalu
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)

    const pendingTickets = await db
      .select({
        ticketNumber: ticketDB.ticketNumber,
        title: ticketDB.title,
        priority: ticketDB.priority,
        createdAt: ticketDB.createdAt,
      })
      .from(ticketDB)
      .where(
        sql`${ticketDB.status} IN ('Open', 'In Progress') AND ${ticketDB.createdAt} < ${fourHoursAgo.toISOString()}`
      )
      .orderBy(ticketDB.createdAt)

    if (pendingTickets.length === 0) {
      return NextResponse.json({ sent: false, message: 'Tidak ada ticket pending > 4 jam' })
    }

    // Format tiap ticket — hitung jam sejak dibuat
    const lines = pendingTickets.map((t) => {
      const createdAt = t.createdAt ? new Date(t.createdAt) : new Date()
      const hoursAgo = ((Date.now() - createdAt.getTime()) / (1000 * 60 * 60)).toFixed(1)
      const pEmoji = PRIORITY_EMOJI[t.priority] ?? '⚪'
      return `• ${t.ticketNumber} - ${t.title} (${pEmoji} ${t.priority}, ${hoursAgo} jam)`
    })

    const message = [
      `⏰ *Reminder Ticket Pending*`,
      ``,
      `Ada ${pendingTickets.length} ticket yang belum selesai lebih dari 4 jam:`,
      ...lines,
      ``,
      `Cek dashboard: https://intools.homa.co.id/app/tickets`,
    ].join('\n')

    await sendTelegramToUser(ADMIN_CHAT_ID, message)

    return NextResponse.json({
      sent: true,
      count: pendingTickets.length,
    })
  } catch (error) {
    console.error('[/api/telegram/reminder] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
