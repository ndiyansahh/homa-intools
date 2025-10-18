import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TrialDetail, TrialData } from '@/types/trial';
import { logAuditEvent } from '@/lib/logger';

// Import trial data from main route - in production this would be from database
// For now, we'll duplicate the structure but in real app this would be shared
let trialsData: TrialData[] = [
  {
    id: '1',
    customerName: 'Handi Sulyansah',
    acquisition: 'HOMA',
    address: '1 Park Residences',
    district: 'Jl Greenlake',
    city: 'Tangerang',
    postalCode: '15148',
    residentialType: 'House',
    assignments: [
      {
        id: '1a',
        trialDate: '25/11/2022',
        assignedCleaner: 'Syeila',
        status: 'Not Converted',
        reasonForNotConverting: 'Schedule conflict'
      },
      {
        id: '1b',
        trialDate: '25/11/2023',
        assignedCleaner: 'Imam',
        status: 'Converted'
      }
    ],
    notes: 'Customer from HOMA acquisition, initially had scheduling issues but converted on second trial',
    createdAt: '2022-11-20T10:00:00Z',
    updatedAt: '2023-11-25T14:30:00Z',
    isDeleted: false,
  },
  {
    id: '2',
    customerName: 'Sarah Williams',
    acquisition: 'Altrix',
    address: 'Apartment 15B Green Tower',
    district: 'Jl Sudirman',
    city: 'Jakarta',
    postalCode: '12190',
    residentialType: 'Apartment',
    assignments: [
      {
        id: '2a',
        trialDate: '15/12/2025',
        assignedCleaner: 'Handi',
        status: 'Stalling/Postpone',
        reasonForNotConverting: 'Needs more time to decide'
      }
    ],
    notes: 'Altrix lead, currently postponing decision',
    createdAt: '2025-10-10T10:00:00Z',
    updatedAt: '2025-10-10T10:00:00Z',
    isDeleted: false,
  },
  {
    id: '3',
    customerName: 'Michael Chen',
    acquisition: 'HOMA',
    address: 'Office Suite 501, Plaza Indonesia',
    district: 'Jl Thamrin',
    city: 'Jakarta',
    postalCode: '10350',
    residentialType: 'Office Space',
    assignments: [
      {
        id: '3a',
        trialDate: '20/12/2025',
        assignedCleaner: 'Syeila',
        status: 'Converted'
      }
    ],
    notes: 'Office space cleaning, converted immediately after trial',
    createdAt: '2025-10-11T14:30:00Z',
    updatedAt: '2025-10-11T14:30:00Z',
    isDeleted: false,
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const trial = trialsData.find(t => t.id === params.id);

    if (!trial || trial.isDeleted) {
      return NextResponse.json({ error: 'Trial not found' }, { status: 404 });
    }

    // Return the full trial data (TrialDetail is now same as TrialData)
    return NextResponse.json(trial);
  } catch (error) {
    console.error('Get trial detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can delete
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const trialIndex = trialsData.findIndex(t => t.id === params.id);
    
    if (trialIndex === -1 || trialsData[trialIndex].isDeleted) {
      return NextResponse.json({ error: 'Trial not found' }, { status: 404 });
    }

    // Soft delete
    trialsData[trialIndex].isDeleted = true;
    trialsData[trialIndex].updatedAt = new Date().toISOString();

    // Log audit event
    logAuditEvent({
      action: 'trial_deleted',
      userId: session.userId,
      email: session.email,
      details: {
        trialId: trialsData[trialIndex].id,
        customerName: trialsData[trialIndex].customerName,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete trial error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}