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

  // Kita hanya proses pesan teks biasa, abaikan sticker/foto/dll
  if (!message || typeof message.text !== 'string') {
    return new Response('OK', { status: 200 })
  }

  const chat = message.chat as Record<string, unknown> | undefined
  const from = message.from as Record<string, unknown> | undefined

  const chatId = String(chat?.id ?? '')
  const firstName = String(from?.first_name ?? from?.username ?? 'Pengguna')
  const text = message.text as string

  if (!chatId) {
    return new Response('OK', { status: 200 })
  }

  // Handle /broadcast — hanya admin yang boleh
  if (text.startsWith('/broadcast') && chatId === ADMIN_CHAT_ID) {
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
  // (Telegram tidak butuh hasil proses, hanya butuh 200 OK cepat)
  handleTelegramUpdate({ chatId, firstName, text }).catch((err) => {
    console.error('[Telegram Webhook] Unhandled error in handleTelegramUpdate:', err)
  })

  return new Response('OK', { status: 200 })
}
