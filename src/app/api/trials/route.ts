import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CreateTrialRequest, TrialListItem, TrialsResponse, TrialData } from '@/types/trial';
import { logAuditEvent } from '@/lib/logger';

// Mock data storage (replace with real database)
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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can create
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateTrialRequest = await request.json();

    // Validation
    if (!body.customerName?.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    if (!body.address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!body.district?.trim()) {
      return NextResponse.json({ error: 'District is required' }, { status: 400 });
    }

    if (!body.city?.trim()) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 });
    }

    if (!body.postalCode?.trim()) {
      return NextResponse.json({ error: 'Postal code is required' }, { status: 400 });
    }

    if (!body.assignments || body.assignments.length === 0) {
      return NextResponse.json({ error: 'At least one trial assignment is required' }, { status: 400 });
    }

    // Validate date format (dd/MM/yyyy) for all assignments
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    for (const assignment of body.assignments) {
      if (!dateRegex.test(assignment.trialDate)) {
        return NextResponse.json({ 
          error: 'Invalid date format. Use dd/MM/yyyy format' 
        }, { status: 400 });
      }
      if (!assignment.assignedCleaner?.trim()) {
        return NextResponse.json({ error: 'Assigned cleaner is required for each trial' }, { status: 400 });
      }
    }

    const newTrialId = Date.now().toString();
    const assignments = body.assignments.map((assignment, index) => ({
      id: `${newTrialId}_${index + 1}`,
      trialDate: assignment.trialDate,
      assignedCleaner: assignment.assignedCleaner.trim(),
      status: assignment.status || 'Not Converted',
      reasonForNotConverting: assignment.reasonForNotConverting,
    }));

    const newTrial: TrialData = {
      id: newTrialId,
      customerName: body.customerName.trim(),
      acquisition: body.acquisition,
      address: body.address.trim(),
      district: body.district.trim(),
      city: body.city.trim(),
      postalCode: body.postalCode.trim(),
      residentialType: body.residentialType,
      assignments,
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    trialsData.push(newTrial);

    // Log audit event
    logAuditEvent({
      action: 'trial_created',
      userId: session.userId,
      email: session.email,
      details: {
        trialId: newTrial.id,
        customerName: newTrial.customerName,
        assignmentsCount: assignments.length,
      },
    });

    return NextResponse.json({ id: newTrial.id }, { status: 201 });
  } catch (error) {
    console.error('Create trial error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const cleaner = searchParams.get('cleaner') || '';
    const acquisition = searchParams.get('acquisition') || '';
    const city = searchParams.get('city') || '';
    const residentialType = searchParams.get('residentialType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Filter trials (exclude soft deleted by default)
    let filteredTrials = trialsData.filter(trial => !trial.isDeleted);

    // Apply search filters
    if (q) {
      const searchTerm = q.toLowerCase();
      filteredTrials = filteredTrials.filter(trial =>
        trial.customerName.toLowerCase().includes(searchTerm) ||
        trial.address.toLowerCase().includes(searchTerm) ||
        trial.district.toLowerCase().includes(searchTerm)
      );
    }

    if (acquisition) {
      filteredTrials = filteredTrials.filter(trial => trial.acquisition === acquisition);
    }

    if (city) {
      filteredTrials = filteredTrials.filter(trial => 
        trial.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (residentialType) {
      filteredTrials = filteredTrials.filter(trial => trial.residentialType === residentialType);
    }

    if (status) {
      filteredTrials = filteredTrials.filter(trial =>
        trial.assignments.some(assignment => assignment.status === status)
      );
    }

    if (cleaner) {
      filteredTrials = filteredTrials.filter(trial =>
        trial.assignments.some(assignment => 
          assignment.assignedCleaner.toLowerCase().includes(cleaner.toLowerCase())
        )
      );
    }

    // Sort by creation date (newest first)
    filteredTrials.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Convert to list items with 5 important data fields
    const items: TrialListItem[] = filteredTrials.map(trial => {
      const latestAssignment = trial.assignments[trial.assignments.length - 1];
      const nextTrialDate = trial.assignments
        .find(a => ['Not Converted', 'Stalling/Postpone'].includes(a.status))?.trialDate;
      
      return {
        id: trial.id,
        customerName: trial.customerName,
        acquisition: trial.acquisition,
        district: trial.district,
        city: trial.city,
        residentialType: trial.residentialType,
        nextTrialDate,
        assignedCleaners: trial.assignments.map(a => a.assignedCleaner),
        overallStatus: latestAssignment?.status,
        createdAt: trial.createdAt,
        isDeleted: trial.isDeleted,
      };
    });

    // Pagination
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    const response: TrialsResponse = {
      items: paginatedItems,
      page,
      total,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get trials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}