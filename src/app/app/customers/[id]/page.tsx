import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import CustomerDetail from '@/components/customer-detail';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Check RBAC - ADMIN/OWNER/STAFF can access
  if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
    redirect('/app/dashboard');
  }

  const { id } = await params;

  return (
    <div className="h-full">
      <div>
        <CustomerDetail customerId={id} session={session} />
      </div>
    </div>
  );
}