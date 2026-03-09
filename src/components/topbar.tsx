'use client';

import Link from 'next/link';
import { BreadcrumbItem } from '@/types/navigation';
import { SessionData } from '@/types/auth';
import { Icons } from './icons';
import LogoutButton from './logout-button';

interface TopbarProps {
  breadcrumbs: BreadcrumbItem[];
  session: SessionData;
  onMenuClick: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}

export default function Topbar({ breadcrumbs, session, onMenuClick, onToggleCollapse, isCollapsed }: TopbarProps) {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Mobile menu and breadcrumbs */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open sidebar"
            >
              <Icons.menu className="h-5 w-5" />
            </button>

            {/* Desktop toggle button */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <Icons.chevronRight className="h-5 w-5" />
              ) : (
                <Icons.chevronLeft className="h-5 w-5" />
              )}
            </button>
            
            {/* Breadcrumbs */}
            <nav className="hidden sm:flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <Link 
                    href={"/app/dashboard" as any}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Icons.home className="w-4 h-4 mr-1" />
                    Home
                  </Link>
                </li>
                {breadcrumbs.map((breadcrumb, index) => (
                  <li key={breadcrumb.name} className="flex items-center">
                    <Icons.chevronRight className="h-4 w-4 text-gray-300 mx-1" />
                    {breadcrumb.href ? (
                      <Link
                        href={breadcrumb.href as any}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {breadcrumb.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
                        {breadcrumb.name}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Right side - User controls */}
          <div className="flex items-center space-x-3">
            {/* User info */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{session.email}</div>
                <div className="text-xs text-gray-500">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${session.role === 'ADMIN' 
                      ? 'bg-purple-100 text-purple-800' 
                      : session.role === 'OWNER'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                    }
                  `}>
                    {session.role}
                  </span>
                </div>
              </div>
              
              {/* User avatar */}
              <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <span className="text-sm font-semibold text-gray-600">
                  {session.email.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            
            {/* Logout button */}
            <LogoutButton userId={session.userId} email={session.email} />
          </div>
        </div>
      </div>
    </header>
  );
}