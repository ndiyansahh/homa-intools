import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TrialDetailPage from '@/components/trial-detail-page';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TrialPage({ params }: PageProps) {
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
      <TrialDetailPage trialId={id} session={session} />
    </div>
  );
}
