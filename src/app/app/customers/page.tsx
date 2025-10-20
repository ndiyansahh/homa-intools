import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import CustomerManagement from '@/components/customer-management';

export default async function CustomersPage() {
  const session = await getSession();

  // For development, create mock session if none exists
  const mockSession = {
    userId: 'dev-user',
    role: 'ADMIN' as const,
    email: 'dev@homa.com',
    loginTime: new Date().toISOString(),
  };

  const currentSession = session || (process.env.NODE_ENV === 'development' ? mockSession : null);

  if (!currentSession) {
    redirect('/login');
  }

  // Check RBAC - ADMIN/OWNER/STAFF can access
  if (!['ADMIN', 'OWNER', 'STAFF'].includes(currentSession.role)) {
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
        
        <CustomerManagement session={currentSession} />
      </div>
    </div>
  );
}