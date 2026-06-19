// Telegram Bot - Conversation handler untuk ticketing system HOMA
// Handles: /start, /report, /status, /cancel
// Conversation state disimpan in-memory (Map) - cukup untuk use case ini

import { db } from '@/lib/db'
import { ticketDB, botUserDB } from '@/lib/schema'
import { eq, desc, sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConversationStep =
  | 'awaiting_title'
  | 'awaiting_category'
  | 'awaiting_priority'
  | 'awaiting_invoice'
  | 'awaiting_customer'
  | 'awaiting_mitra'
  | 'awaiting_description'

interface ConversationState {
  step: ConversationStep
  title?: string
  category?: string
  priority?: string
  invoiceId?: string
  customerName?: string
  mitraName?: string
}

// ---------------------------------------------------------------------------
// In-memory conversation state
// Key: Telegram chat_id (string)
// ---------------------------------------------------------------------------

const conversationState = new Map<string, ConversationState>()

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: Record<string, string> = {
  '1': 'Bug Feature',
  '2': 'Data Seed',
  '3': 'UI Issue',
  '4': 'Data Salah',
  '5': 'Pertanyaan',
  '6': 'Lainnya',
}

const PRIORITIES: Record<string, { label: string; value: string; emoji: string }> = {
  '1': { label: 'Tidak bisa kerja sama sekali', value: 'High', emoji: '🔴' },
  '2': { label: 'Bisa kerja tapi terganggu', value: 'Medium', emoji: '🟡' },
  '3': { label: 'Minor, tidak urgent', value: 'Low', emoji: '🟢' },
}

// ---------------------------------------------------------------------------
// Telegram API helpers
// ---------------------------------------------------------------------------

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID

async function sendMessage(chatId: string, text: string): Promise<void> {
  if (!TELEGRAM_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })
  } catch {
    // Silently fail — jangan crash kalau Telegram unreachable
  }
}

async function sendAdminNotification(text: string): Promise<void> {
  if (!ADMIN_CHAT_ID) return
  await sendMessage(ADMIN_CHAT_ID, text)
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function findBotUser(chatId: string) {
  const users = await db
    .select()
    .from(botUserDB)
    .where(eq(botUserDB.chatId, chatId))
    .limit(1)
  return users[0] ?? null
}

async function generateTicketNumber(): Promise<string> {
  // Query max ticket number dari DB, lalu increment
  const result = await db
    .select({ max: sql<string>`MAX(ticket_number)` })
    .from(ticketDB)

  const maxRaw = result[0]?.max // e.g. "HOMA-042" or null
  let next = 1
  if (maxRaw) {
    const match = maxRaw.match(/HOMA-(\d+)/)
    if (match) next = parseInt(match[1], 10) + 1
  }
  return `HOMA-${String(next).padStart(3, '0')}`
}

function toJakartaDateString(date: Date): string {
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

async function handleStart(chatId: string, firstName: string): Promise<void> {
  const existing = await findBotUser(chatId)

  if (existing) {
    if (!existing.isActive) {
      await sendMessage(
        chatId,
        `Halo ${existing.name}! Akunmu sedang tidak aktif. Hubungi admin untuk diaktifkan kembali ya.`,
      )
      return
    }
    await sendMessage(
      chatId,
      `Halo lagi, *${existing.name}*! 👋\n\nKamu sudah terdaftar sebelumnya.\n\nKetik /report untuk lapor masalah atau /status untuk cek status ticket kamu.`,
    )
    return
  }

  // Register user baru
  await db.insert(botUserDB).values({
    chatId,
    name: firstName,
    role: 'reporter',
    isActive: true,
  })

  await sendMessage(
    chatId,
    `Halo *${firstName}*! 👋 Selamat datang di HOMA Support Bot.\n\nKamu sudah terdaftar sebagai reporter.\n\n*Perintah yang tersedia:*\n• /report — Lapor bug atau masalah\n• /status — Cek status ticket kamu\n• /cancel — Batalkan laporan yang sedang dibuat`,
  )
}

async function handleReport(chatId: string, user: NonNullable<Awaited<ReturnType<typeof findBotUser>>>): Promise<void> {
  // Mulai conversation baru
  conversationState.set(chatId, { step: 'awaiting_title' })

  await sendMessage(
    chatId,
    `📝 *Laporan Masalah Baru*\n\nOke ${user.name}, ayo kita buat ticket!\n\n*Langkah 1 dari 7*\nKasih judul singkat untuk masalahnya ya. Contoh: "Dropdown mitra kosong di halaman trial"`,
  )
}

async function handleStatus(chatId: string, user: NonNullable<Awaited<ReturnType<typeof findBotUser>>>): Promise<void> {
  const tickets = await db
    .select({
      ticketNumber: ticketDB.ticketNumber,
      title: ticketDB.title,
      status: ticketDB.status,
      priority: ticketDB.priority,
      createdAt: ticketDB.createdAt,
    })
    .from(ticketDB)
    .where(eq(ticketDB.reportedByChatId, chatId))
    .orderBy(desc(ticketDB.createdAt))
    .limit(10)

  if (tickets.length === 0) {
    await sendMessage(chatId, `Kamu belum pernah bikin ticket nih, ${user.name}.\n\nKetik /report untuk lapor masalah pertama kamu!`)
    return
  }

  const statusEmoji: Record<string, string> = {
    Open: '🔴',
    'In Progress': '🟡',
    Resolved: '✅',
  }

  const priorityEmoji: Record<string, string> = {
    High: '🔴',
    Medium: '🟡',
    Low: '🟢',
  }

  const lines = tickets.map((t) => {
    const sEmoji = statusEmoji[t.status] ?? '⚪'
    const pEmoji = priorityEmoji[t.priority] ?? ''
    const date = t.createdAt ? toJakartaDateString(new Date(t.createdAt)) : '-'
    return `${sEmoji} *${t.ticketNumber}* — ${t.title}\n   ${pEmoji} ${t.priority} · ${t.status} · ${date}`
  })

  await sendMessage(chatId, `📋 *Ticket kamu (10 terbaru):*\n\n${lines.join('\n\n')}`)
}

async function handleCancel(chatId: string): Promise<void> {
  const active = conversationState.get(chatId)
  if (!active) {
    await sendMessage(chatId, 'Tidak ada laporan yang sedang dibuat. Ketik /report untuk mulai laporan baru.')
    return
  }
  conversationState.delete(chatId)
  await sendMessage(chatId, 'Laporan dibatalkan. Ketik /report kalau mau mulai lagi ya.')
}

// ---------------------------------------------------------------------------
// Conversation flow
// ---------------------------------------------------------------------------

async function handleConversationStep(
  chatId: string,
  text: string,
  user: NonNullable<Awaited<ReturnType<typeof findBotUser>>>,
): Promise<void> {
  const state = conversationState.get(chatId)
  if (!state) {
    await sendMessage(
      chatId,
      'Ketik /report untuk lapor masalah atau /status untuk cek status ticket kamu.',
    )
    return
  }

  switch (state.step) {
    case 'awaiting_title': {
      if (text.trim().length < 5) {
        await sendMessage(chatId, 'Judulnya terlalu pendek nih. Coba lebih deskriptif ya, minimal 5 karakter.')
        return
      }
      state.title = text.trim()
      state.step = 'awaiting_category'
      conversationState.set(chatId, state)

      await sendMessage(
        chatId,
        `*Langkah 2 dari 7*\nPilih kategori masalahnya:\n\n1️⃣ Bug Feature\n2️⃣ Data Seed\n3️⃣ UI Issue\n4️⃣ Data Salah\n5️⃣ Pertanyaan\n6️⃣ Lainnya\n\nBalas dengan angka 1-6 ya.`,
      )
      break
    }

    case 'awaiting_category': {
      const cat = CATEGORIES[text.trim()]
      if (!cat) {
        await sendMessage(chatId, 'Balasnya pakai angka 1-6 ya:\n\n1 Bug Feature\n2 Data Seed\n3 UI Issue\n4 Data Salah\n5 Pertanyaan\n6 Lainnya')
        return
      }
      state.category = cat
      state.step = 'awaiting_priority'
      conversationState.set(chatId, state)

      await sendMessage(
        chatId,
        `*Langkah 3 dari 7*\nSeberapa parah masalahnya?\n\n1️⃣ Tidak bisa kerja sama sekali\n2️⃣ Bisa kerja tapi terganggu\n3️⃣ Minor, tidak urgent\n\nBalas dengan angka 1-3.`,
      )
      break
    }

    case 'awaiting_priority': {
      const prio = PRIORITIES[text.trim()]
      if (!prio) {
        await sendMessage(chatId, 'Balasnya pakai angka 1-3 ya:\n\n1 Tidak bisa kerja sama sekali\n2 Bisa kerja tapi terganggu\n3 Minor, tidak urgent')
        return
      }
      state.priority = prio.value
      state.step = 'awaiting_invoice'
      conversationState.set(chatId, state)

      await sendMessage(
        chatId,
        `*Langkah 4 dari 7*\nAda Invoice ID yang berkaitan?\n\nContoh: \`INV/Cleaning/2026.6.10-02016\`\n\nKalau tidak ada, ketik *skip*.`,
      )
      break
    }

    case 'awaiting_invoice': {
      const val = text.trim()
      state.invoiceId = val.toLowerCase() === 'skip' ? undefined : val
      state.step = 'awaiting_customer'
      conversationState.set(chatId, state)

      await sendMessage(
        chatId,
        `*Langkah 5 dari 7*\nAda nama customer yang berkaitan?\n\nContoh: \`Budi Santoso\`\n\nKalau tidak ada, ketik *skip*.`,
      )
      break
    }

    case 'awaiting_customer': {
      const val = text.trim()
      state.customerName = val.toLowerCase() === 'skip' ? undefined : val
      state.step = 'awaiting_mitra'
      conversationState.set(chatId, state)

      await sendMessage(
        chatId,
        `*Langkah 6 dari 7*\nAda nama mitra yang berkaitan?\n\nContoh: \`Sari\`\n\nKalau tidak ada, ketik *skip*.`,
      )
      break
    }

    case 'awaiting_mitra': {
      const val = text.trim()
      state.mitraName = val.toLowerCase() === 'skip' ? undefined : val
      state.step = 'awaiting_description'
      conversationState.set(chatId, state)

      await sendMessage(
        chatId,
        `*Langkah 7 dari 7 (terakhir!)*\nCeritain detail masalahnya ya. Semakin detail semakin cepat bisa di-fix.\n\nContoh: "Dropdown mitra tidak muncul saat buka halaman trial di browser Chrome. Sudah coba refresh tapi tetap kosong."`,
      )
      break
    }

    case 'awaiting_description': {
      if (text.trim().length < 10) {
        await sendMessage(chatId, 'Deskripsinya kurang detail nih. Coba ceritain lebih lengkap ya (minimal 10 karakter).')
        return
      }

      const description = text.trim()

      // Semua data sudah terkumpul, simpan ke DB
      try {
        const ticketNumber = await generateTicketNumber()

        await db.insert(ticketDB).values({
          ticketNumber,
          reportedByChatId: chatId,
          reportedByName: user.name,
          title: state.title!,
          category: state.category!,
          priority: state.priority!,
          invoiceId: state.invoiceId ?? null,
          customerName: state.customerName ?? null,
          mitraName: state.mitraName ?? null,
          description,
          status: 'Open',
        })

        conversationState.delete(chatId)

        const priorityEntry = Object.values(PRIORITIES).find((p) => p.value === state.priority!)
        const priorityDisplay = priorityEntry ? `${priorityEntry.emoji} ${priorityEntry.value}` : state.priority!

        // Konfirmasi ke reporter
        await sendMessage(
          chatId,
          `✅ *Ticket berhasil dibuat!*\n\n*Nomor Ticket:* \`${ticketNumber}\`\n*Judul:* ${state.title}\n*Kategori:* ${state.category}\n*Priority:* ${priorityDisplay}\n\nTim developer sudah dinotifikasi. Pantau statusnya dengan /status ya!`,
        )

        // Notifikasi ke admin
        const adminMsg = [
          `🎫 *Ticket Baru: ${ticketNumber}*`,
          `*Dari:* ${user.name}`,
          `*Judul:* ${state.title}`,
          `*Kategori:* ${state.category}`,
          `*Priority:* ${priorityDisplay}`,
          state.invoiceId ? `*Invoice:* \`${state.invoiceId}\`` : null,
          state.customerName ? `*Customer:* ${state.customerName}` : null,
          state.mitraName ? `*Mitra:* ${state.mitraName}` : null,
          `*Deskripsi:* ${description}`,
        ]
          .filter(Boolean)
          .join('\n')

        await sendAdminNotification(adminMsg)
      } catch (err) {
        console.error('[Telegram Bot] Failed to save ticket:', err)
        conversationState.delete(chatId)
        await sendMessage(
          chatId,
          '❌ Waduh, ada masalah saat menyimpan ticket. Coba lagi ya dengan /report.',
        )
      }
      break
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry point — dipanggil oleh webhook route
// ---------------------------------------------------------------------------

export async function handleTelegramUpdate(update: {
  chatId: string
  firstName: string
  text: string
}): Promise<void> {
  const { chatId, firstName, text } = update
  const trimmed = text.trim()

  // Handle commands
  if (trimmed.startsWith('/start')) {
    await handleStart(chatId, firstName)
    return
  }

  // Semua command selain /start butuh user terdaftar
  const user = await findBotUser(chatId)
  if (!user) {
    await sendMessage(
      chatId,
      'Halo! Kamu belum terdaftar nih. Ketik /start dulu ya untuk registrasi.',
    )
    return
  }

  if (!user.isActive) {
    await sendMessage(
      chatId,
      'Akunmu sedang tidak aktif. Hubungi admin ya.',
    )
    return
  }

  if (trimmed.startsWith('/report')) {
    // Kalau ada conversation yang berjalan, tanya dulu
    if (conversationState.has(chatId)) {
      await sendMessage(
        chatId,
        'Kamu masih ada laporan yang belum selesai. Lanjutkan atau ketik /cancel untuk batalkan.',
      )
      return
    }
    await handleReport(chatId, user)
    return
  }

  if (trimmed.startsWith('/status')) {
    await handleStatus(chatId, user)
    return
  }

  if (trimmed.startsWith('/cancel')) {
    await handleCancel(chatId)
    return
  }

  // Bukan command — mungkin lagi di tengah conversation
  if (conversationState.has(chatId)) {
    await handleConversationStep(chatId, trimmed, user)
    return
  }

  // Random text, tidak ada context
  await sendMessage(
    chatId,
    'Ketik /report untuk lapor masalah atau /status untuk cek status ticket kamu.',
  )
}
