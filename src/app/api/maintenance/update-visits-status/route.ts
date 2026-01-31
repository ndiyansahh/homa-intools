import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { visitDB } from '@/lib/schema';
import { eq, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        // Strict RBAC: Only ADMIN or OWNER
        if (!session || !['ADMIN', 'OWNER'].includes(session.role)) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized. Admin/Owner access required.' },
                { status: 403 }
            );
        }

        console.log(`🔧 Starting visit status migration by ${session.email}`);

        // Get all 'Scheduled' visits
        const scheduledVisits = await db
            .select()
            .from(visitDB)
            .where(eq(visitDB.status, 'Scheduled'));

        console.log(`📊 Found ${scheduledVisits.length} scheduled visits to update.`);

        if (scheduledVisits.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No scheduled visits found to update.',
                count: 0
            });
        }

        let updatedCount = 0;

        // Update each visit to 'Done'
        // Note: Doing loop to set completedAt accurately based on scheduledDate/actualDate
        // This could be optimized to batch update if all updates were identical, but completedAt varies

        for (const visit of scheduledVisits) {
            const completedDate = visit.actualDate
                ? new Date(visit.actualDate)
                : new Date(visit.scheduledDate);

            await db
                .update(visitDB)
                .set({
                    status: 'Done',
                    completedAt: completedDate,
                    updatedAt: new Date(),
                    updatedBy: `MIGRATION:${session.email}`
                })
                .where(eq(visitDB.id, visit.id));

            updatedCount++;
        }

        console.log(`✅ Successfully updated ${updatedCount} visits to Done status.`);

        return NextResponse.json({
            success: true,
            message: `Successfully migrated ${updatedCount} visits to 'Done' status.`,
            count: updatedCount
        });

    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to run migration', error: String(error) },
            { status: 500 }
        );
    }
}
