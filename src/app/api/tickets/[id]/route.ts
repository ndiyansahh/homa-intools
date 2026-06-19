import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function sendTelegramNotification(chatId: string, message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('TELEGRAM_BOT_TOKEN not set, skipping notification');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Failed to send Telegram notification:', err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Fetch current ticket
    const existing = await db
      .select()
      .from(ticketDB)
      .where(eq(ticketDB.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticket = existing[0];
    const now = new Date();

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.estimatedDuration !== undefined) updateData.estimatedDuration = body.estimatedDuration;
    if (body.fixNotes !== undefined) updateData.fixNotes = body.fixNotes;

    // Auto-resolve logic
    if (body.status === 'Resolved' && ticket.status !== 'Resolved') {
      updateData.resolvedAt = now;
      const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : now;
      const diffMs = now.getTime() - createdAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      updateData.timeToFix = diffHours.toFixed(2);
    }

    const [updated] = await db
      .update(ticketDB)
      .set(updateData)
      .where(eq(ticketDB.id, id))
      .returning();

    // Send Telegram notifications on status change
    if (body.status && body.status !== ticket.status) {
      let message = '';

      if (body.status === 'In Progress') {
        message =
          `*Update Tiket ${ticket.ticketNumber}*\n\n` +
          `Halo ${ticket.reportedByName}, tiket kamu sedang diproses.\n\n` +
          `*Judul:* ${ticket.title}\n` +
          `*Status:* In Progress\n` +
          (updateData.estimatedDuration
            ? `*Estimasi:* ${updateData.estimatedDuration}\n`
            : '') +
          `\nKami akan update kamu lagi ketika sudah selesai.`;
      } else if (body.status === 'Resolved') {
        message =
          `*Tiket ${ticket.ticketNumber} Selesai!*\n\n` +
          `Halo ${ticket.reportedByName}, tiket kamu sudah diselesaikan.\n\n` +
          `*Judul:* ${ticket.title}\n` +
          `*Status:* Resolved\n` +
          (body.fixNotes ? `*Catatan Fix:* ${body.fixNotes}\n` : '') +
          `\nTerima kasih sudah melaporkan. Kalau ada masalah lain, jangan ragu untuk lapor lagi!`;
      }

      if (message) {
        await sendTelegramNotification(ticket.reportedByChatId, message);
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
