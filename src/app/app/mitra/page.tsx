import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import MitraManagement from '@/components/mitra-management';

export default async function MitraPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Check RBAC - ADMIN/OWNER/STAFF can access
  if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
    redirect('/app');
  }

  return (
    <div className="h-full">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Mitra Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your partners and cleaners information, status, and assignments.
          </p>
        </div>
        
        <MitraManagement session={session} />
      </div>
    </div>
  );
}