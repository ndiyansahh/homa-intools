import { redirect } from 'next/navigation';

interface TrialDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TrialDetailPage({ params }: TrialDetailPageProps) {
  const { id } = await params;
  redirect(`/app/trials/${id}`);
}
