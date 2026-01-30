import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Icons } from '@/components/icons';

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Check RBAC - ADMIN/OWNER can access settings
  if (!['ADMIN', 'OWNER'].includes(session.role)) {
    redirect('/app/dashboard');
  }

  return (
    <div className="h-full">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure system settings and application preferences.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/app/packages"
            className="block p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Icons.box className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Subscription Packages</h3>
            <p className="text-sm text-gray-600">
              Manage pricing plans and visit frequencies for customers
            </p>
          </Link>

          <Link
            href="/app/payouts?tab=rates"
            className="block p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icons.currency className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Mitra Payout Rates</h3>
            <p className="text-sm text-gray-600">
              Configure monthly payout rates per mitra and subscription package
            </p>
          </Link>

          {/* Placeholder for future settings */}
          <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Icons.cog className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-400">
              More settings will be available here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}