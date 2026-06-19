// POST /api/telegram/webhook
// Telegram mengirim setiap update (pesan masuk) ke endpoint ini.
// Harus reply 200 OK secepat mungkin — Telegram retry kalau timeout.

import { handleTelegramUpdate } from '@/lib/telegram-bot'
import { sendTelegramToUser } from '@/lib/logger'
import { broadcastToUsers } from '@/lib/telegram-server'

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    // Body bukan JSON valid — abaikan saja
    return new Response('OK', { status: 200 })
  }

  // Struktur Telegram update: { update_id, message: { chat: { id }, from: { first_name }, text } }
  const update = body as Record<string, unknown>
  const message = update?.message as Record<string, unknown> | undefined

  if (!message) {
    return new Response('OK', { status: 200 })
  }

  const chat = message.chat as Record<string, unknown> | undefined
  const from = message.from as Record<string, unknown> | undefined
  const chatId = String(chat?.id ?? '')
  const firstName = String(from?.first_name ?? from?.username ?? 'Pengguna')

  if (!chatId) return new Response('OK', { status: 200 })

  // Extract foto — ambil file_id resolusi tertinggi (last item di array)
  const photos = message.photo as Array<Record<string, unknown>> | undefined
  const photoFileId = photos?.length
    ? String(photos[photos.length - 1].file_id)
    : undefined

  const text = typeof message.text === 'string' ? message.text : undefined

  // Abaikan kalau bukan teks dan bukan foto
  if (!text && !photoFileId) {
    return new Response('OK', { status: 200 })
  }

  // Handle /broadcast — hanya admin yang boleh
  if (text?.startsWith('/broadcast') && chatId === ADMIN_CHAT_ID) {
    const broadcastMsg = text.replace(/^\/broadcast\s*/, '').trim()
    if (!broadcastMsg) {
      sendTelegramToUser(chatId, '❌ Format salah. Gunakan: /broadcast <pesan>').catch(() => {})
      return new Response('OK', { status: 200 })
    }

    broadcastToUsers(broadcastMsg)
      .then((count) => sendTelegramToUser(chatId, `✅ Pesan berhasil dikirim ke ${count} pengguna`))
      .catch((err) => {
        console.error('[Telegram Webhook] Broadcast error:', err)
        sendTelegramToUser(chatId, '❌ Gagal mengirim broadcast. Cek log server.').catch(() => {})
      })

    return new Response('OK', { status: 200 })
  }

  // Proses update secara async — tidak block response ke Telegram
  handleTelegramUpdate({ chatId, firstName, text, photoFileId }).catch((err) => {
    console.error('[Telegram Webhook] Unhandled error in handleTelegramUpdate:', err)
  })

  return new Response('OK', { status: 200 })
}
