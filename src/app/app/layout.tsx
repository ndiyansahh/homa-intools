import AppLayout from '@/components/app-layout';

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}