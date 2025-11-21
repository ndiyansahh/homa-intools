import { db } from '@/lib/db';
import { attendanceRecordDB, customerDB, mitraDB, subscriptionPackageDB } from '@/lib/schema';
import { eq, and, or, sql, count, max } from 'drizzle-orm';

/**
 * Utility function to calculate visit information
 */
function calculateVisitInfo(visitDate: Date, subscriptionStart: Date, totalVisits: number, dayPattern?: string) {
  const visitDay = visitDate.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Calculate week number (1-based)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const timeDiff = visitDate.getTime() - subscriptionStart.getTime();
  const visitWeek = Math.floor(timeDiff / msPerWeek) + 1;
  
  // Calculate month number (1-based)
  const startMonth = subscriptionStart.getMonth();
  const startYear = subscriptionStart.getFullYear();
  const visitMonth = (visitDate.getFullYear() - startYear) * 12 + (visitDate.getMonth() - startMonth) + 1;
  
  return {
    visitDay,
    visitWeek,
    visitMonth
  };
}

/**
 * Interface for creating attendance record with all required data
 */
export interface CreateAttendanceRecordParams {
  scheduleId?: string;
  customerId: string;
  mitraId: string;
  visitDate: Date; // Required: specific date for this visit
  visitNumber?: number; // Optional: will be auto-calculated if not provided
  checkInTime?: Date;
  checkOutTime?: Date;
  status?: 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  workQuality?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  actualDuration?: number;
}

/**
 * Creates an attendance record with all data populated from related tables
 */
export async function createAttendanceRecord(params: CreateAttendanceRecordParams) {
  try {
    // Get customer data with subscription info
    const customerResult = await db
      .select({
        customerName: customerDB.customerName,
        address: customerDB.address,
        subscriptionStart: customerDB.subscriptionStart,
        subscriptionEnd: customerDB.subscriptionEnd,
        subscriptionPackageId: customerDB.subscriptionPackageId,
        subscriptionPackage: customerDB.subscriptionPackage,
        dayPattern: customerDB.dayPattern,
      })
      .from(customerDB)
      .where(
        and(
          eq(customerDB.id, params.customerId),
          or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
        )
      )
      .limit(1);

    if (customerResult.length === 0) {
      throw new Error(`Customer with ID ${params.customerId} not found`);
    }

    const customer = customerResult[0];

    // Get mitra data
    const mitraResult = await db
      .select({
        mitraCode: mitraDB.mitraCode,
        mitraName: mitraDB.mitraName,
      })
      .from(mitraDB)
      .where(
        and(
          eq(mitraDB.id, params.mitraId),
          or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
        )
      )
      .limit(1);

    if (mitraResult.length === 0) {
      throw new Error(`Mitra with ID ${params.mitraId} not found`);
    }

    const mitra = mitraResult[0];

    // Get subscription package name if subscriptionPackageId exists
    let subscriptionPackageName = customer.subscriptionPackage || '';
    if (customer.subscriptionPackageId) {
      const packageResult = await db
        .select({
          packageName: subscriptionPackageDB.subscriptionPackage,
        })
        .from(subscriptionPackageDB)
        .where(eq(subscriptionPackageDB.id, customer.subscriptionPackageId))
        .limit(1);

      if (packageResult.length > 0) {
        subscriptionPackageName = packageResult[0].packageName;
      }
    }

    // Calculate visit number if not provided
    let visitNumber = params.visitNumber;
    if (!visitNumber) {
      const existingVisitsResult = await db
        .select({ maxVisit: max(attendanceRecordDB.visitNumber) })
        .from(attendanceRecordDB)
        .where(
          and(
            eq(attendanceRecordDB.customerId, params.customerId),
            or(eq(attendanceRecordDB.isDeleted, false), sql`${attendanceRecordDB.isDeleted} IS NULL`)
          )
        );
      
      visitNumber = (existingVisitsResult[0]?.maxVisit || 0) + 1;
    }

    // Calculate total visits from subscription or default
    const totalVisits = customer.subscriptionPackage?.includes('3 visits per week') ? 12 : 
                       customer.subscriptionPackage?.includes('2 visits per week') ? 8 : 4; // Default monthly visits

    // Calculate visit tracking info
    const subscriptionStart = customer.subscriptionStart ? new Date(customer.subscriptionStart) : new Date();
    const visitInfo = calculateVisitInfo(params.visitDate, subscriptionStart, totalVisits, customer.dayPattern || undefined);

    // Create attendance record with populated data
    const attendanceData = {
      scheduleId: params.scheduleId || null,
      customerId: params.customerId,
      mitraId: params.mitraId,
      subscriptionPackageId: customer.subscriptionPackageId,
      
      // Populated from customerDB
      clientName: customer.customerName,
      address: customer.address || '',
      subscriptionPackage: subscriptionPackageName,
      
      // Date info from customerDB
      startDate: customer.subscriptionStart || new Date().toISOString().split('T')[0],
      endDate: customer.subscriptionEnd || null,
      
      // Dynamic mitra info from mitraDB
      attendanceMitraCode: mitra.mitraCode || '',
      attendanceMitraName: mitra.mitraName || '',
      
      // Visit tracking information
      visitNumber: visitNumber,
      totalVisits: totalVisits,
      visitDate: params.visitDate.toISOString().split('T')[0],
      visitDay: visitInfo.visitDay,
      visitWeek: visitInfo.visitWeek,
      visitMonth: visitInfo.visitMonth,
      
      // Day pattern from customerDB
      dayPattern: customer.dayPattern,
      
      // Legacy cleaner assignments (for backward compatibility)
      cleaner1: mitra.mitraName || '',
      cleaner2: null,
      
      // Attendance details
      checkInTime: params.checkInTime || null,
      checkOutTime: params.checkOutTime || null,
      actualDuration: params.actualDuration || null,
      workQuality: params.workQuality || null,
      
      // Status and notes
      status: params.status || 'Scheduled',
      notes: params.notes || null,
    };

    const result = await db
      .insert(attendanceRecordDB)
      .values(attendanceData)
      .returning({ 
        id: attendanceRecordDB.id,
        clientName: attendanceRecordDB.clientName,
        attendanceMitraCode: attendanceRecordDB.attendanceMitraCode,
        attendanceMitraName: attendanceRecordDB.attendanceMitraName,
        visitNumber: attendanceRecordDB.visitNumber,
        totalVisits: attendanceRecordDB.totalVisits,
        visitDate: attendanceRecordDB.visitDate,
        visitDay: attendanceRecordDB.visitDay,
      });

    console.log('✅ Attendance record created successfully:', {
      id: result[0].id,
      clientName: result[0].clientName,
      mitraCode: result[0].attendanceMitraCode,
      mitraName: result[0].attendanceMitraName,
      visitNumber: result[0].visitNumber,
      visitDate: result[0].visitDate,
      visitDay: result[0].visitDay,
    });

    return result[0];

  } catch (error) {
    console.error('❌ Error creating attendance record:', error);
    throw error;
  }
}

/**
 * Updates attendance record with fresh mitra data (for consistency)
 */
export async function updateAttendanceRecordMitraInfo(attendanceId: string, mitraId: string) {
  try {
    // Get fresh mitra data
    const mitraResult = await db
      .select({
        mitraCode: mitraDB.mitraCode,
        mitraName: mitraDB.mitraName,
      })
      .from(mitraDB)
      .where(
        and(
          eq(mitraDB.id, mitraId),
          or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
        )
      )
      .limit(1);

    if (mitraResult.length === 0) {
      throw new Error(`Mitra with ID ${mitraId} not found`);
    }

    const mitra = mitraResult[0];

    // Update attendance record with fresh mitra info
    const result = await db
      .update(attendanceRecordDB)
      .set({
        mitraId: mitraId,
        attendanceMitraCode: mitra.mitraCode || '',
        attendanceMitraName: mitra.mitraName || '',
        cleaner1: mitra.mitraName || '', // Update legacy field too
        updatedAt: new Date(),
      })
      .where(eq(attendanceRecordDB.id, attendanceId))
      .returning({ 
        id: attendanceRecordDB.id,
        attendanceMitraCode: attendanceRecordDB.attendanceMitraCode,
        attendanceMitraName: attendanceRecordDB.attendanceMitraName,
      });

    console.log('✅ Attendance record mitra info updated:', {
      id: result[0].id,
      mitraCode: result[0].attendanceMitraCode,
      mitraName: result[0].attendanceMitraName,
    });

    return result[0];

  } catch (error) {
    console.error('❌ Error updating attendance record mitra info:', error);
    throw error;
  }
}

/**
 * Gets attendance records with all populated data
 */
export async function getAttendanceRecordsWithFullData(filters?: {
  customerId?: string;
  mitraId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const conditions = [];
    
    // Add filters
    if (filters?.customerId) {
      conditions.push(eq(attendanceRecordDB.customerId, filters.customerId));
    }
    
    if (filters?.mitraId) {
      conditions.push(eq(attendanceRecordDB.mitraId, filters.mitraId));
    }
    
    if (filters?.status) {
      conditions.push(eq(attendanceRecordDB.status, filters.status));
    }
    
    if (filters?.startDate) {
      conditions.push(sql`${attendanceRecordDB.startDate} >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      conditions.push(sql`${attendanceRecordDB.endDate} <= ${filters.endDate}`);
    }
    
    // Add soft delete condition
    conditions.push(or(eq(attendanceRecordDB.isDeleted, false), sql`${attendanceRecordDB.isDeleted} IS NULL`));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const result = await db
      .select({
        id: attendanceRecordDB.id,
        scheduleId: attendanceRecordDB.scheduleId,
        customerId: attendanceRecordDB.customerId,
        mitraId: attendanceRecordDB.mitraId,
        subscriptionPackageId: attendanceRecordDB.subscriptionPackageId,
        
        // Client info (populated from customerDB)
        clientName: attendanceRecordDB.clientName,
        address: attendanceRecordDB.address,
        subscriptionPackage: attendanceRecordDB.subscriptionPackage,
        
        // Date info
        startDate: attendanceRecordDB.startDate,
        endDate: attendanceRecordDB.endDate,
        newEndDate: attendanceRecordDB.newEndDate,
        
        // Dynamic mitra info
        attendanceMitraCode: attendanceRecordDB.attendanceMitraCode,
        attendanceMitraName: attendanceRecordDB.attendanceMitraName,
        
        // Visit tracking information
        visitNumber: attendanceRecordDB.visitNumber,
        totalVisits: attendanceRecordDB.totalVisits,
        visitDate: attendanceRecordDB.visitDate,
        visitDay: attendanceRecordDB.visitDay,
        visitWeek: attendanceRecordDB.visitWeek,
        visitMonth: attendanceRecordDB.visitMonth,
        
        // Day pattern
        dayPattern: attendanceRecordDB.dayPattern,
        
        // Legacy fields
        cleaner1: attendanceRecordDB.cleaner1,
        cleaner2: attendanceRecordDB.cleaner2,
        
        // Attendance details
        checkInTime: attendanceRecordDB.checkInTime,
        checkOutTime: attendanceRecordDB.checkOutTime,
        actualDuration: attendanceRecordDB.actualDuration,
        workQuality: attendanceRecordDB.workQuality,
        
        // Status and metadata
        status: attendanceRecordDB.status,
        notes: attendanceRecordDB.notes,
        createdAt: attendanceRecordDB.createdAt,
        updatedAt: attendanceRecordDB.updatedAt,
      })
      .from(attendanceRecordDB)
      .where(whereClause)
      .orderBy(sql`${attendanceRecordDB.createdAt} DESC`)
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return result.map(record => ({
      ...record,
      dayPattern: record.dayPattern ? JSON.parse(record.dayPattern) : null,
    }));

  } catch (error) {
    console.error('❌ Error getting attendance records:', error);
    throw error;
  }
}