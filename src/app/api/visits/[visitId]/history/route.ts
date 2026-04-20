import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLogDB, visitMitraChangeHistoryDB, visitActionHistoryDB, mitraDB } from '@/lib/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { visitId } = await params;

  // 1. Ganti mitra history dari visitMitraChangeHistoryDB (sudah ada sejak lama)
  const mitraChanges = await db
    .select({
      id: visitMitraChangeHistoryDB.id,
      fromMitraId: visitMitraChangeHistoryDB.fromMitraId,
      toMitraId: visitMitraChangeHistoryDB.toMitraId,
      changeReason: visitMitraChangeHistoryDB.changeReason,
      sequenceNumber: visitMitraChangeHistoryDB.sequenceNumber,
      changedAt: visitMitraChangeHistoryDB.changedAt,
    })
    .from(visitMitraChangeHistoryDB)
    .where(eq(visitMitraChangeHistoryDB.visitId, visitId))
    .orderBy(asc(visitMitraChangeHistoryDB.sequenceNumber));

  // Fetch mitra names
  const mitraIds = [...new Set([
    ...mitraChanges.map(c => c.fromMitraId),
    ...mitraChanges.map(c => c.toMitraId),
  ])];
  const mitraMap: Record<string, string> = {};
  for (const mid of mitraIds) {
    const r = await db.select({ name: mitraDB.mitraName }).from(mitraDB).where(eq(mitraDB.id, mid)).limit(1);
    if (r[0]) mitraMap[mid] = r[0].name;
  }

  const mitraLogs = mitraChanges.map(c => ({
    id: c.id,
    action: 'CHANGE_MITRA',
    userEmail: null,
    createdAt: c.changedAt,
    oldValue: { mitraName: mitraMap[c.fromMitraId] || c.fromMitraId },
    newValue: { mitraName: mitraMap[c.toMitraId] || c.toMitraId, changeReason: c.changeReason },
  }));

  // 2. Edit tanggal & cancel dari visitActionHistoryDB
  const actionLogs = await db
    .select({
      id: visitActionHistoryDB.id,
      actionType: visitActionHistoryDB.actionType,
      oldValue: visitActionHistoryDB.oldValue,
      newValue: visitActionHistoryDB.newValue,
      changedBy: visitActionHistoryDB.changedBy,
      changedAt: visitActionHistoryDB.changedAt,
    })
    .from(visitActionHistoryDB)
    .where(eq(visitActionHistoryDB.visitId, visitId))
    .orderBy(desc(visitActionHistoryDB.changedAt));

  const actionMapped = actionLogs.map(l => ({
    id: l.id,
    action: l.actionType,
    userEmail: l.changedBy,
    createdAt: l.changedAt,
    oldValue: l.oldValue,
    newValue: l.newValue,
  }));

  // Merge dan sort by time
  const allLogs = [...mitraLogs, ...actionMapped].sort(
    (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );

  return NextResponse.json({ logs: allLogs });
}
