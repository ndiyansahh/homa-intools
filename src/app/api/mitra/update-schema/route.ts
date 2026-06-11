import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB } from '@/lib/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';

/**
 * API endpoint to update Ahmad Rizki and Syeila Nurhasanah with comprehensive schema fields
 * This endpoint updates their existing records to use the new mitraDB schema structure
 */

const updatedMitraData = [
  {
    // Syeila Nurhasanah - Updated to comprehensive schema
    searchName: 'Syeila Nurhasanah',
    updateData: {
      mitraCode: 'MITRA-202210-000001',
      mitraNIK: '3171081506950002', // 16 digit NIK
      mitraGender: 'Wanita',
      mitraDOB: '06/15/1995', // mm/dd/yyyy format  
      mitraPhone: '081291662589', // 12 digits without country code
      
      // Banking information
      mitraBankAccount: 'BCA',
      mitraBankHolderName: 'Syeila Nurhasanah',
      mitraBankAccountNumber: '5271236489',
      
      // Assignment details
      mitraCityAssignment: 'Jakarta Barat', // Valid Jabodetabek city
      mitraLocationAssignment: JSON.stringify(['Kebon Jeruk', 'Palmerah']), // Array of districts
      mitraPartnership: 'Full Time' as const,
      mitraTenure: 12, // Number of months
      mitraExitDate: null,
      mitraBonusCommission: 'Eligible' as const,
      
      // Legacy fields for backward compatibility
      contact: '081291662589',
      address: 'Jl. Kebon Jeruk No. 123, Jakarta Barat',
      city: 'Jakarta Barat',
      district: 'Kebon Jeruk',
      
      status: 'Active',
    }
  },
  {
    // Ahmad Rizki - Updated to comprehensive schema
    searchName: 'Ahmad Rizki',
    updateData: {
      mitraCode: 'MITRA-202210-000002',
      mitraNIK: '3172082107880003', // 16 digit NIK
      mitraGender: 'Pria',
      mitraDOB: '07/21/1988', // mm/dd/yyyy format
      mitraPhone: '081234567890', // 12 digits without country code
      
      // Banking information
      mitraBankAccount: 'Mandiri',
      mitraBankHolderName: 'Ahmad Rizki',
      mitraBankAccountNumber: '1234567890',
      
      // Assignment details
      mitraCityAssignment: 'Jakarta Pusat', // Valid Jabodetabek city
      mitraLocationAssignment: JSON.stringify(['Sudirman', 'Thamrin']), // Array of districts
      mitraPartnership: 'Part Time' as const,
      mitraTenure: 6, // Number of months
      mitraExitDate: null,
      mitraBonusCommission: 'Eligible' as const,
      
      // Legacy fields for backward compatibility
      contact: '081234567890',
      address: 'Jl. Sudirman No. 456, Jakarta Pusat',
      city: 'Jakarta Pusat',
      district: 'Sudirman',
      
      status: 'Active',
    }
  }
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - Only ADMIN/OWNER can perform schema updates
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const results = [];
    let totalUpdated = 0;

    console.log('🔄 Starting mitra schema update for Ahmad Rizki and Syeila Nurhasanah...');

    for (const mitraUpdate of updatedMitraData) {
      try {
        console.log(`📝 Updating: ${mitraUpdate.searchName}`);

        // Check if mitra exists
        const existingMitra = await db
          .select({ id: mitraDB.id, mitraName: mitraDB.mitraName })
          .from(mitraDB)
          .where(
            and(
              eq(mitraDB.mitraName, mitraUpdate.searchName),
              or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
            )
          )
          .limit(1);

        if (existingMitra.length === 0) {
          console.log(`⚠️  Mitra not found: ${mitraUpdate.searchName}`);
          results.push({
            mitra: mitraUpdate.searchName,
            success: false,
            message: 'Mitra not found in database'
          });
          continue;
        }

        // Update the mitra with comprehensive schema fields
        const updateResult = await db
          .update(mitraDB)
          .set({
            ...mitraUpdate.updateData,
            updatedAt: new Date(),
          })
          .where(eq(mitraDB.id, existingMitra[0].id))
          .returning({ 
            id: mitraDB.id, 
            mitraName: mitraDB.mitraName,
            mitraCode: mitraDB.mitraCode,
            mitraNIK: mitraDB.mitraNIK
          });

        if (updateResult.length > 0) {
          totalUpdated++;
          const updated = updateResult[0];
          
          console.log(`✅ Successfully updated: ${mitraUpdate.searchName}`);
          console.log(`   🆔 ID: ${updated.id}`);
          console.log(`   📄 Code: ${updated.mitraCode}`);
          console.log(`   🆔 NIK: ${updated.mitraNIK}`);

          results.push({
            mitra: mitraUpdate.searchName,
            success: true,
            id: updated.id,
            mitraCode: updated.mitraCode,
            mitraNIK: updated.mitraNIK,
            message: 'Successfully updated with comprehensive schema fields'
          });

          // Log audit event
          if (session) {
            await logAuditEvent({
              action: 'MITRA_SCHEMA_UPDATED',
              userId: session.userId,
              email: session.email,
              details: {
                mitraId: updated.id,
                mitraName: updated.mitraName,
                mitraCode: updated.mitraCode,
                mitraNIK: updated.mitraNIK,
                updatedFields: Object.keys(mitraUpdate.updateData)
              }
            });
          }

        } else {
          console.log(`❌ Failed to update: ${mitraUpdate.searchName}`);
          results.push({
            mitra: mitraUpdate.searchName,
            success: false,
            message: 'Update operation failed'
          });
        }

      } catch (updateError) {
        console.error(`❌ Error updating ${mitraUpdate.searchName}:`, updateError);
        results.push({
          mitra: mitraUpdate.searchName,
          success: false,
          message: `Update error: ${(updateError as Error).message}`,
          error: 'Database error'
        });
      }
    }

    // Verify the updates by fetching updated records
    try {
      const verificationResult = await db
        .select({
          id: mitraDB.id,
          mitraName: mitraDB.mitraName,
          mitraCode: mitraDB.mitraCode,
          mitraNIK: mitraDB.mitraNIK,
          mitraGender: mitraDB.mitraGender,
          mitraDOB: mitraDB.mitraDOB,
          mitraPhone: mitraDB.mitraPhone,
          mitraBankAccount: mitraDB.mitraBankAccount,
          mitraCityAssignment: mitraDB.mitraCityAssignment,
          mitraPartnership: mitraDB.mitraPartnership,
          mitraTenure: mitraDB.mitraTenure,
          mitraBonusCommission: mitraDB.mitraBonusCommission,
          status: mitraDB.status,
        })
        .from(mitraDB)
        .where(
          and(
            sql`${mitraDB.mitraName} IN ('Syeila Nurhasanah', 'Ahmad Rizki')`,
            or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
          )
        );

      console.log('📋 Verification - Updated records:');
      verificationResult.forEach(record => {
        console.log(`👤 ${record.mitraName}: Code=${record.mitraCode}, NIK=${record.mitraNIK}, Phone=${record.mitraPhone}`);
      });

      return NextResponse.json({
        success: true,
        message: `Schema update completed. ${totalUpdated} out of ${updatedMitraData.length} mitras updated successfully.`,
        data: {
          totalProcessed: updatedMitraData.length,
          totalUpdated: totalUpdated,
          results: results,
          verification: verificationResult
        }
      });

    } catch (verifyError) {
      console.error('Verification error:', verifyError);
      return NextResponse.json({
        success: true,
        message: `Schema update completed. ${totalUpdated} out of ${updatedMitraData.length} mitras updated successfully. (Verification failed)`,
        data: {
          totalProcessed: updatedMitraData.length,
          totalUpdated: totalUpdated,
          results: results,
          verificationError: 'Could not verify updates'
        }
      });
    }

  } catch (error) {
    console.error('Mitra schema update error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update mitra schema',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current state of Ahmad Rizki and Syeila Nurhasanah
    const currentRecords = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        mitraCode: mitraDB.mitraCode,
        mitraNIK: mitraDB.mitraNIK,
        mitraGender: mitraDB.mitraGender,
        mitraDOB: mitraDB.mitraDOB,
        mitraPhone: mitraDB.mitraPhone,
        mitraBankAccount: mitraDB.mitraBankAccount,
        mitraBankHolderName: mitraDB.mitraBankHolderName,
        mitraBankAccountNumber: mitraDB.mitraBankAccountNumber,
        mitraCityAssignment: mitraDB.mitraCityAssignment,
        mitraLocationAssignment: mitraDB.mitraLocationAssignment,
        mitraPartnership: mitraDB.mitraPartnership,
        mitraTenure: mitraDB.mitraTenure,
        mitraExitDate: mitraDB.mitraExitDate,
        mitraBonusCommission: mitraDB.mitraBonusCommission,
        status: mitraDB.status,
        updatedAt: mitraDB.updatedAt,
      })
      .from(mitraDB)
      .where(
        and(
          sql`${mitraDB.mitraName} IN ('Syeila Nurhasanah', 'Ahmad Rizki')`,
          or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Current mitra records retrieved',
      data: {
        currentRecords: currentRecords,
        updatePreview: updatedMitraData
      }
    });

  } catch (error) {
    console.error('Get mitra records error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve mitra records',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}