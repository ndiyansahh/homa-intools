import type { Metadata } from 'next';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}