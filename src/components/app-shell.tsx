'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SessionData } from '@/types/auth';
import { NavigationItem } from '@/types/navigation';
import { getVisibleNavItems, generateBreadcrumbs } from '@/lib/navigation';
import { logNavigationEvent } from '@/lib/logger';
import Sidebar from './sidebar';
import Topbar from './topbar';

interface AppShellProps {
  children: React.ReactNode;
  session: SessionData;
}

export default function AppShell({ children, session }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const visibleNavItems = getVisibleNavItems(session.role);
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Log page views
  useEffect(() => {
    logNavigationEvent({
      action: 'page_view',
      userId: session.userId,
      email: session.email,
      path: pathname,
    });
  }, [pathname, session.userId, session.email]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          navigationItems={visibleNavItems}
          session={session}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar */}
          <Topbar
            breadcrumbs={breadcrumbs}
            session={session}
            onMenuClick={() => setSidebarOpen(true)}
          />
          
          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-50/50" role="main">
            <div className="h-full">
              <div className="h-full bg-white lg:ml-59 xl:ml-55">
                <div className="px-4 sm:px-6 lg:pl-0 lg:pr-8 xl:pl-0 xl:pr-8 py-8">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}