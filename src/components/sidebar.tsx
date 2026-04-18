'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavigationItem } from '@/types/navigation';
import { logNavigationEvent } from '@/lib/logger';
import { SessionData } from '@/types/auth';
import { Icons } from './icons';

interface SidebarProps {
  navigationItems: NavigationItem[];
  session: SessionData;
  isOpen: boolean;
  isCollapsed: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

const getIcon = (iconName: string) => {
  const IconComponent = Icons[iconName as keyof typeof Icons];
  return IconComponent || Icons.dashboard;
};

export default function Sidebar({ navigationItems, session, isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  const handleMenuClick = (item: NavigationItem) => {
    logNavigationEvent({
      action: 'menu_click',
      userId: session.userId,
      email: session.email,
      details: {
        path: item.href,
        menuItem: item.name,
      }
    });

    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white backdrop-blur-xl border-r border-gray-200/20 shadow-xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:inset-0
        ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* Header */}
        <div className={`flex items-center h-16 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm transition-all duration-300 ${isCollapsed ? 'lg:justify-center lg:px-3' : 'justify-between px-6'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src="/images/homa-logo.png" alt="HOMA Logo" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                HOMA
              </h1>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-6 space-y-2 transition-all duration-300 ${isCollapsed ? 'lg:px-2' : 'px-4'}`} role="navigation" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const IconComponent = getIcon(item.icon);

            return (
              <Link
                key={item.name}
                href={item.href as any}
                onClick={() => handleMenuClick(item)}
                className={`
                  group flex items-center rounded-xl transition-all duration-200 relative
                  ${isCollapsed ? 'lg:justify-center lg:px-2 lg:py-3' : 'px-3 py-3'}
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                title={isCollapsed ? item.name : undefined}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full" />
                )}

                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 flex-shrink-0
                  ${isCollapsed ? 'lg:mr-0' : 'mr-3'}
                  ${isActive
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700'
                  }
                `}>
                  <IconComponent className="w-5 h-5" />
                </div>

                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {item.description}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info footer */}
        <div className={`border-t border-gray-200/50 p-4 bg-white/80 backdrop-blur-sm transition-all duration-300 ${isCollapsed ? 'lg:flex lg:justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:flex-col lg:space-x-0 lg:space-y-2' : 'space-x-3'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-gray-600">
                {session.email.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.email}
                </p>
                <div className="flex items-center mt-1">
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}