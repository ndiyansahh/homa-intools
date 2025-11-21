import { NextRequest, NextResponse } from 'next/server';
import { createAttendanceRecord } from '@/lib/utils/attendanceUtils';

/**
 * Test endpoint to demonstrate the improved attendanceRecordDB functionality
 * This will create an attendance record with all data populated from related tables
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Example: Create attendance record with populated data
    const result = await createAttendanceRecord({
      customerId: body.customerId, // Required: existing customer ID
      mitraId: body.mitraId,       // Required: existing mitra ID
      visitDate: body.visitDate ? new Date(body.visitDate) : new Date(), // Required: visit date
      status: 'Scheduled',
      notes: 'Test attendance record with populated data',
    });

    return NextResponse.json({
      success: true,
      message: 'Test attendance record created successfully',
      data: {
        id: result.id,
        clientName: result.clientName,           // ✅ Populated from customerDB.customerName
        attendanceMitraCode: result.attendanceMitraCode, // ✅ Populated from mitraDB.mitraCode
        attendanceMitraName: result.attendanceMitraName, // ✅ Populated from mitraDB.mitraName
      },
      explanation: {
        'clientName': 'Automatically populated from customerDB.customerName',
        'address': 'Automatically populated from customerDB.address', 
        'subscriptionPackage': 'Automatically populated from subscriptionPackageDB.packageName',
        'startDate': 'Automatically populated from customerDB.subscriptionStart',
        'endDate': 'Automatically populated from customerDB.subscriptionEnd',
        'attendanceMitraCode': 'Dynamically populated from mitraDB.mitraCode',
        'attendanceMitraName': 'Dynamically populated from mitraDB.mitraName',
        'dayPattern': 'Automatically populated from customerDB.dayPattern (day1, day2, day3)',
        'visitNumber': 'Auto-incremented visit number for this customer',
        'visitDate': 'Specific date for this visit',
        'visitDay': 'Day of the week for this visit',
        'totalVisits': 'Expected total visits for the subscription',
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      message: 'Make sure to provide valid customerId and mitraId'
    }, { status: 400 });
  }
}

/**
 * GET endpoint to demonstrate the improved data structure
 */
export async function GET() {
  return NextResponse.json({
    message: 'AttendanceRecordDB Improvements Documentation',
    improvements: {
      schema_changes: {
        'clientName': 'Now populated from customerDB.customerName (dynamic)',
        'address': 'Now populated from customerDB.address (dynamic)', 
        'subscriptionPackage': 'Now populated from subscriptionPackageDB.packageName via relation',
        'startDate': 'Now populated from customerDB.subscriptionStart (dynamic)',
        'endDate': 'Now populated from customerDB.subscriptionEnd (dynamic)',
        'attendanceMitraCode': 'NEW FIELD - dynamically populated from mitraDB.mitraCode',
        'attendanceMitraName': 'NEW FIELD - dynamically populated from mitraDB.mitraName',
        'dayPattern': 'NEW FIELD - populated from customerDB.dayPattern (day1, day2, day3)',
        'subscriptionPackageId': 'NEW FIELD - relation to subscriptionPackageDB'
      },
      data_consistency: {
        'automatic_population': 'All fields are automatically populated from related tables',
        'dynamic_updates': 'Mitra info stays consistent even if mitra data changes',
        'relational_integrity': 'Proper foreign key relationships with customerDB, mitraDB, subscriptionPackageDB'
      },
      api_improvements: {
        'createAttendanceRecord()': 'Utility function that populates all data automatically',
        'updateAttendanceRecordMitraInfo()': 'Function to update mitra info for consistency',
        'getAttendanceRecordsWithFullData()': 'Retrieves attendance with all populated data including parsed dayPattern'
      }
    },
    usage: {
      'POST /api/attendance/test-create': 'Test the improved functionality',
      'required_params': ['customerId', 'mitraId'],
      'example': {
        'customerId': '879d467b-990e-4cee-a158-53375891805a',
        'mitraId': '6c0f57ac-6cbe-449b-9828-4a28ab06fa5b'
      }
    }
  });
}