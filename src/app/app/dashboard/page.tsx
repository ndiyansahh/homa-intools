import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getVisibleNavItems } from '@/lib/navigation';
import { Icons } from '@/components/icons';

const getIcon = (iconName: string) => {
  const IconComponent = Icons[iconName as keyof typeof Icons];
  return IconComponent || Icons.dashboard;
};

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const visibleNavItems = getVisibleNavItems(session.role);
  const loginTime = new Date(session.loginTime).toLocaleString('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Mock data for demo
  const stats = [
    { name: 'Total Customers', value: '2,847', change: '+12%', trend: 'up', icon: Icons.users },
    { name: 'Active Trials', value: '186', change: '+8%', trend: 'up', icon: Icons.beaker },
    { name: 'Monthly Revenue', value: '$45,231', change: '+23%', trend: 'up', icon: Icons.currency },
    { name: 'Staff Online', value: '14', change: '0%', trend: 'neutral', icon: Icons.clock },
  ];

  const recentActivities = [
    { user: 'John Doe', action: 'Completed trial session', time: '2 minutes ago', type: 'trial' },
    { user: 'Jane Smith', action: 'New customer registration', time: '15 minutes ago', type: 'customer' },
    { user: 'Mike Johnson', action: 'Payment processed', time: '32 minutes ago', type: 'payment' },
    { user: 'Sarah Wilson', action: 'Clock-in attendance', time: '1 hour ago', type: 'attendance' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Good morning, {session.email.split('@')[0]}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 text-right">
          <div className="text-sm text-gray-500">Last login</div>
          <div className="text-sm font-medium text-gray-900">{loginTime}</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.name}
              className="card p-5 hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-white to-gray-50/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className={`
                  flex items-center text-sm font-medium
                  ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'}
                `}>
                  {stat.change}
                  {stat.trend === 'up' && (
                    <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 7l-3 3-3-3h6z" clipRule="evenodd" transform="rotate(180 10 10)" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.name}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              <div className="text-sm text-gray-500">Choose a module to get started</div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleNavItems
                .filter(item => item.href !== '/app/dashboard')
                .map((item) => {
                  const IconComponent = getIcon(item.icon);
                  return (
                    <Link
                      key={item.name}
                      href={item.href as any}
                      className="group p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50/30"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                          <IconComponent className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          <div className="mt-3 flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                            Open {item.name}
                            <Icons.chevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Recent Activity & System Status */}
        <div className="space-y-5">
          {/* Recent Activity */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`
                    w-2 h-2 rounded-full mt-2
                    ${activity.type === 'trial' ? 'bg-purple-400' :
                      activity.type === 'customer' ? 'bg-green-400' :
                      activity.type === 'payment' ? 'bg-yellow-400' :
                      'bg-blue-400'}
                  `} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-700">Authentication</span>
                </div>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-700">Database</span>
                </div>
                <span className="text-sm font-medium text-green-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-gray-700">Backup Service</span>
                </div>
                <span className="text-sm font-medium text-yellow-600">Scheduled</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Access Level</span>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${session.role === 'ADMIN' 
                    ? 'bg-purple-100 text-purple-800' 
                    : session.role === 'OWNER'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                  }
                `}>
                  {session.role === 'ADMIN' || session.role === 'OWNER' ? 'Full Access' : 'Standard Access'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}