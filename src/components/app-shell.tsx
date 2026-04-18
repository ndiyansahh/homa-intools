'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SessionData } from '@/types/auth';
import { NavigationItem } from '@/types/navigation';
import { getVisibleNavItems, generateBreadcrumbs } from '@/lib/navigation';
import { logNavigationEvent } from '@/lib/logger';
import { BreadcrumbProvider, useBreadcrumbOverride } from '@/lib/breadcrumb-context';
import { ToastProvider } from '@/lib/toast';
import { ConfirmProvider } from './confirm-dialog';
import Sidebar from './sidebar';
import Topbar from './topbar';
import Toaster from './toaster';

interface AppShellProps {
  children: React.ReactNode;
  session: SessionData;
}

function AppShellInner({ children, session }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const visibleNavItems = getVisibleNavItems(session.role);
  const { overrides } = useBreadcrumbOverride();
  const breadcrumbs = generateBreadcrumbs(pathname, overrides);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsedState !== null) {
      setSidebarCollapsed(savedCollapsedState === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  // Log page views
  useEffect(() => {
    logNavigationEvent({
      action: 'page_view',
      userId: session.userId,
      email: session.email,
      details: {
        path: pathname,
      }
    });
  }, [pathname, session.userId, session.email]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="flex min-h-screen items-start">
        {/* Sidebar */}
        <Sidebar
          navigationItems={visibleNavItems}
          session={session}
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <Topbar
            breadcrumbs={breadcrumbs}
            session={session}
            onMenuClick={() => setSidebarOpen(true)}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            isCollapsed={sidebarCollapsed}
          />

          {/* Page content */}
          <main className="flex-1 bg-gray-50/50" role="main">
            <div className="bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children, session }: AppShellProps) {
  return (
    <BreadcrumbProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppShellInner session={session}>{children}</AppShellInner>
          <Toaster />
        </ConfirmProvider>
      </ToastProvider>
    </BreadcrumbProvider>
  );
}