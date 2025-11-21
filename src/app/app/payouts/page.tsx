import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import PayoutManagement from '@/components/payout-management';

export default async function PayoutPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Only ADMIN, OWNER, and STAFF can access payout page
  if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
    redirect('/app/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payout Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage monthly payouts for mitras, including bonus adjustments and exports
          </p>
        </div>

        <PayoutManagement session={session} />
      </div>
    </div>
  );
}
