// GET /api/telegram/daily-summary
// Kirim daily summary ticket ke admin setiap pagi.
// Dipanggil oleh cron job — dilindungi dengan x-cron-secret header.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ticketDB } from '@/lib/schema'
import { eq, sql } from 'drizzle-orm'
import { sendTelegramToUser } from '@/lib/logger'

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET

function getJakartaDateRange(offsetDays: number): { start: Date; end: Date } {
  // Hitung start/end hari (offsetDays=0 = hari ini, -1 = kemarin) dalam WIB (UTC+7)
  const nowUtc = new Date()
  // Offset WIB dalam milis
  const wibOffsetMs = 7 * 60 * 60 * 1000
  const nowWib = new Date(nowUtc.getTime() + wibOffsetMs)

  const startWib = new Date(nowWib)
  startWib.setUTCDate(startWib.getUTCDate() + offsetDays)
  startWib.setUTCHours(0, 0, 0, 0)

  const endWib = new Date(startWib)
  endWib.setUTCHours(23, 59, 59, 999)

  // Konversi balik ke UTC untuk query
  return {
    start: new Date(startWib.getTime() - wibOffsetMs),
    end: new Date(endWib.getTime() - wibOffsetMs),
  }
}

function getDayName(date: Date): string {
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
  })
}

function getDateLabel(date: Date): string {
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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
    const yesterday = getJakartaDateRange(-1)
    const yesterdayLabel = getDateLabel(yesterday.start)
    const todayDayName = getDayName(new Date())

    // Ticket baru kemarin
    const newYesterdayResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(ticketDB)
      .where(
        sql`${ticketDB.createdAt} >= ${yesterday.start.toISOString()} AND ${ticketDB.createdAt} <= ${yesterday.end.toISOString()}`
      )
    const newYesterday = newYesterdayResult[0]?.count ?? 0

    // Ticket resolved kemarin (berdasarkan resolvedAt)
    const resolvedYesterdayResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(ticketDB)
      .where(
        sql`${ticketDB.resolvedAt} >= ${yesterday.start.toISOString()} AND ${ticketDB.resolvedAt} <= ${yesterday.end.toISOString()}`
      )
    const resolvedYesterday = resolvedYesterdayResult[0]?.count ?? 0

    // Avg time to fix untuk ticket yang resolved kemarin
    const avgTimeResult = await db
      .select({ avg: sql<number>`AVG(${ticketDB.timeToFix})` })
      .from(ticketDB)
      .where(
        sql`${ticketDB.resolvedAt} >= ${yesterday.start.toISOString()} AND ${ticketDB.resolvedAt} <= ${yesterday.end.toISOString()} AND ${ticketDB.timeToFix} IS NOT NULL`
      )
    const avgTime = avgTimeResult[0]?.avg
    const avgTimeDisplay = avgTime != null ? `${Number(avgTime).toFixed(1)} jam` : '-'

    // Status saat ini
    const openResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(ticketDB)
      .where(eq(ticketDB.status, 'Open'))
    const openNow = openResult[0]?.count ?? 0

    const inProgressResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(ticketDB)
      .where(eq(ticketDB.status, 'In Progress'))
    const inProgressNow = inProgressResult[0]?.count ?? 0

    const totalResolvedResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(ticketDB)
      .where(eq(ticketDB.status, 'Resolved'))
    const totalResolved = totalResolvedResult[0]?.count ?? 0

    const message = [
      `📊 *Daily Summary HOMA Tickets*`,
      `📅 ${todayDayName}, ${yesterdayLabel}`,
      ``,
      `Kemarin:`,
      `• 🆕 Ticket baru: ${newYesterday}`,
      `• ✅ Resolved: ${resolvedYesterday}`,
      `• ⏱ Avg time to fix: ${avgTimeDisplay}`,
      ``,
      `Saat ini:`,
      `• 🔴 Open: ${openNow}`,
      `• 🔄 In Progress: ${inProgressNow}`,
      `• ✅ Total resolved: ${totalResolved}`,
      ``,
      `Semangat! 💪`,
    ].join('\n')

    await sendTelegramToUser(ADMIN_CHAT_ID, message)

    return NextResponse.json({
      sent: true,
      stats: {
        newYesterday,
        resolvedYesterday,
        avgTimeDisplay,
        openNow,
        inProgressNow,
        totalResolved,
      },
    })
  } catch (error) {
    console.error('[/api/telegram/daily-summary] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
