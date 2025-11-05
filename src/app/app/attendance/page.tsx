import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AttendanceManagement from '@/components/attendance-management';

export default async function AttendancePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Check RBAC - ADMIN/OWNER/STAFF can access
  if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
    redirect('/app/dashboard');
  }

  return (
    <div className="h-full">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Attendance Records</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track cleaning service attendance records and manage cleaner assignments.
          </p>
        </div>
        
        <AttendanceManagement session={session} />
      </div>
    </div>
  );
}