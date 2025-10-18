import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import CustomerManagement from '@/components/customer-management';

export default async function CustomersPage() {
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
          <h1 className="text-2xl font-semibold text-gray-900">Customer Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage customer subscriptions, view details, and track customer lifecycle.
          </p>
        </div>
        
        <CustomerManagement session={session} />
      </div>
    </div>
  );
}