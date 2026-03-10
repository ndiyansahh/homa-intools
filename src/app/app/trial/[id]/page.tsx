'use client';

import { useRouter } from 'next/navigation';
import TrialDetail from '@/components/trial-detail';

interface TrialDetailPageProps {
  params: { id: string };
}

export default function TrialDetailPage({ params }: TrialDetailPageProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push('/app/trial');
  };

  return (
    <div className="h-full">
      <div>
        <TrialDetail trialId={params.id} onClose={handleClose} />
      </div>
    </div>
  );
}
