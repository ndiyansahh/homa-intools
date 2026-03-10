import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TrialDetail from '@/components/trial-detail';

interface TrialDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TrialDetailPage({ params }: TrialDetailPageProps) {
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
        <TrialDetail trialId={id} session={session} />
      </div>
    </div>
  );
}
