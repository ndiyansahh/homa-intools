import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import CustomerDetail from '@/components/customer-detail';

interface CustomerDetailPageProps {
  params: { id: string };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
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
        <CustomerDetail customerId={params.id} session={session} />
      </div>
    </div>
  );
}