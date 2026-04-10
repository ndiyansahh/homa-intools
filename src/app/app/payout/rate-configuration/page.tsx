import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import RateConfigurationManagement from '@/components/rate-configuration-management';

export default async function RateConfigurationPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Only ADMIN and OWNER can manage rates
  if (!['ADMIN', 'OWNER'].includes(session.role)) {
    redirect('/app/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rate Configuration</h1>
          <p className="mt-2 text-sm text-gray-600">
            Centrally manage mitra payout rates based on visits per week (1x-7x)
          </p>
        </div>

        <RateConfigurationManagement session={session} />
      </div>
    </div>
  );
}
