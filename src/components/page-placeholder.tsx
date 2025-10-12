import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon: string;
}

export default async function PagePlaceholder({ title, description, icon }: PagePlaceholderProps) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-3xl" aria-hidden="true">{icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6 mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>Coming Soon!</strong> This module is currently under development. 
                  The navigation and layout are ready, but the specific functionality will be implemented in upcoming PRDs.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-900">Current User</h3>
            <p className="text-sm text-gray-500 mt-1">{session.email}</p>
            <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {session.role}
            </span>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-900">Access Level</h3>
            <p className="text-sm text-gray-500 mt-1">
              {session.role === 'ADMIN' || session.role === 'OWNER' ? 'Full Access' : 'Standard Access'}
            </p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-900">Status</h3>
            <p className="text-sm text-gray-500 mt-1">Authentication Active</p>
            <span className="inline-block mt-1 h-2 w-2 bg-green-400 rounded-full"></span>
          </div>
        </div>
      </div>
    </div>
  );
}