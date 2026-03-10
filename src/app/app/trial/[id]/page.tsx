'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import TrialDetail from '@/components/trial-detail';

interface TrialDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TrialDetailPage({ params }: TrialDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const handleClose = () => {
    router.push('/app/trial');
  };

  return (
    <div className="h-full">
      <div>
        <TrialDetail trialId={id} onClose={handleClose} />
      </div>
    </div>
  );
}
