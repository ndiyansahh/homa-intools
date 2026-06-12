import type { Metadata } from 'next';
import './globals.css';
import AuthSessionProvider from '@/components/session-provider';

export const metadata: Metadata = {
  title: 'HOMA - Internal Application',
  description: 'HOMA internal management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}