'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logNavigationEvent } from '@/lib/logger';
import { Icons } from './icons';

interface LogoutButtonProps {
  userId?: string;
  email?: string;
}

export default function LogoutButton({ userId, email }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    
    if (userId && email) {
      logNavigationEvent({
        action: 'logout_click',
        userId,
        email,
      });
    }
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 hover:border-gray-300"
      aria-label="Sign out"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="hidden sm:inline">Signing out...</span>
        </>
      ) : (
        <>
          <Icons.logout className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Sign out</span>
        </>
      )}
    </button>
  );
}