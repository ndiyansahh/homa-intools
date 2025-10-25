import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TrialManagement from '@/components/trial-management';

export default async function TrialPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  // Check RBAC - ADMIN/OWNER/STAFF can access
  if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the Trial management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Trial Management</h1>
        <p className="mt-2 text-gray-600">
          Register trial requests and track their outcomes with cascading region dropdowns and dynamic assignments.
        </p>
      </div>

      <TrialManagement session={session} />
    </div>
  );
}