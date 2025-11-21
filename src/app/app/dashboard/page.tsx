import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getVisibleNavItems } from '@/lib/navigation';
import { Icons } from '@/components/icons';
import { db } from '@/lib/db';
import { customerDB, mitraDB, visitDB, payoutDB } from '@/lib/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

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

  // Get today's date range
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));
  const todayDateString = todayStart.toISOString().split('T')[0];

  // Fetch real data from database
  const [
    totalCustomers,
    activeCustomers,
    activeMitras,
    totalMitras,
    activeTrials,
    totalTrials,
    scheduledVisitsToday,
    completedVisitsToday,
    recentCustomers,
    recentTrials,
  ] = await Promise.all([
    // Total customers
    db.select({ count: sql<number>`count(*)::int` }).from(customerDB),

    // Active customers (subscribed)
    db.select({ count: sql<number>`count(*)::int` })
      .from(customerDB)
      .where(and(eq(customerDB.subscriptionStatus, 'Active'), eq(customerDB.isActive, true))),

    // Active mitras
    db.select({ count: sql<number>`count(*)::int` })
      .from(mitraDB)
      .where(and(eq(mitraDB.isActive, true), eq(mitraDB.status, 'Active'))),

    // Total mitras
    db.select({ count: sql<number>`count(*)::int` }).from(mitraDB),

    // Active trials (Trial status in customerDB)
    db.select({ count: sql<number>`count(*)::int` })
      .from(customerDB)
      .where(eq(customerDB.subscriptionStatus, 'Trial')),

    // Total trials (all customers who ever had trial status)
    db.select({ count: sql<number>`count(*)::int` })
      .from(customerDB)
      .where(sql`${customerDB.subscriptionStatus} IN ('Trial', 'Converted')`),

    // Scheduled visits today
    db.select({ count: sql<number>`count(*)::int` })
      .from(visitDB)
      .where(eq(visitDB.scheduledDate, todayDateString)),

    // Completed visits today
    db.select({ count: sql<number>`count(*)::int` })
      .from(visitDB)
      .where(and(
        eq(visitDB.status, 'Done'),
        gte(visitDB.completedAt, todayStart)
      )),

    // Recent customers (last 5 with Active subscription)
    db.select({
      customerName: customerDB.customerName,
      subscriptionPackage: customerDB.subscriptionPackage,
      createdAt: customerDB.createdAt,
    })
      .from(customerDB)
      .where(eq(customerDB.subscriptionStatus, 'Active'))
      .orderBy(desc(customerDB.createdAt))
      .limit(5),

    // Recent trials (last 5 customers with Trial status)
    db.select({
      customerName: customerDB.customerName,
      subscriptionStatus: customerDB.subscriptionStatus,
      createdAt: customerDB.createdAt,
    })
      .from(customerDB)
      .where(sql`${customerDB.subscriptionStatus} IN ('Trial', 'Converted')`)
      .orderBy(desc(customerDB.createdAt))
      .limit(5),
  ]);

  // Calculate percentages
  const customerActiveRate = totalCustomers[0].count > 0
    ? Math.round((activeCustomers[0].count / totalCustomers[0].count) * 100)
    : 0;

  const mitraActiveRate = totalMitras[0].count > 0
    ? Math.round((activeMitras[0].count / totalMitras[0].count) * 100)
    : 0;

  const trialConversionRate = totalTrials[0].count > 0
    ? Math.round(((totalTrials[0].count - activeTrials[0].count) / totalTrials[0].count) * 100)
    : 0;

  const completionRate = scheduledVisitsToday[0].count > 0
    ? Math.round((completedVisitsToday[0].count / scheduledVisitsToday[0].count) * 100)
    : 0;

  const stats: Array<{
    name: string;
    value: string;
    subValue: string;
    change: string;
    trend: string;
    icon: any;
    href: string;
  }> = [
    {
      name: 'Active Customers',
      value: activeCustomers[0].count.toString(),
      subValue: `of ${totalCustomers[0].count} total`,
      change: `${customerActiveRate}%`,
      trend: 'neutral',
      icon: Icons.users,
      href: '/app/customers',
    },
    {
      name: 'Active Mitras',
      value: activeMitras[0].count.toString(),
      subValue: `of ${totalMitras[0].count} total`,
      change: `${mitraActiveRate}%`,
      trend: 'neutral',
      icon: Icons.users,
      href: '/app/mitras',
    },
    {
      name: 'Active Trials',
      value: activeTrials[0].count.toString(),
      subValue: `${trialConversionRate}% converted`,
      change: trialConversionRate > 50 ? 'Good' : 'Fair',
      trend: trialConversionRate > 50 ? 'up' : 'neutral',
      icon: Icons.beaker,
      href: '/app/trials',
    },
    {
      name: 'Today\'s Visits',
      value: scheduledVisitsToday[0].count.toString(),
      subValue: `${completedVisitsToday[0].count} completed`,
      change: completionRate > 0 ? `${completionRate}%` : 'None',
      trend: completionRate > 80 ? 'up' : 'neutral',
      icon: Icons.clock,
      href: '/app/attendance',
    },
  ];

  // Format recent activity
  const recentActivities = [
    ...recentCustomers.slice(0, 3).map(customer => ({
      user: customer.customerName,
      action: `subscribed to ${customer.subscriptionPackage || 'package'}`,
      time: getRelativeTime(customer.createdAt),
      type: 'customer' as const,
    })),
    ...recentTrials.slice(0, 2).map(trial => ({
      user: trial.customerName || 'Unknown',
      action: `${trial.subscriptionStatus === 'Converted' ? 'converted from' : 'started'} trial`,
      time: getRelativeTime(trial.createdAt),
      type: 'trial' as const,
    })),
  ].sort((a, b) => {
    // Sort by time (most recent first)
    const aTime = a.time.includes('minute') ? parseInt(a.time) : 999;
    const bTime = b.time.includes('minute') ? parseInt(b.time) : 999;
    return aTime - bTime;
  }).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.email.split('@')[0]}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's your business overview for today
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
            <Link
              key={stat.name}
              href={stat.href as any}
              className="card p-5 hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-white to-gray-50/50 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
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
                <div className="text-xs text-gray-500 mt-1">{stat.subValue}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Today's Summary */}
      <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Today's Activity</h3>
            <p className="text-sm text-gray-600 mt-1">Completed visits and ongoing operations</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{completedVisitsToday[0].count}</div>
            <div className="text-sm text-gray-600">Visits Completed</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900">Quick Access</h2>
              <div className="text-sm text-gray-500">Navigate to modules</div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleNavItems
                .filter(item => item.href !== '/app/dashboard')
                .slice(0, 6) // Show top 6 modules
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
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Sidebar: Recent Activity & Role Info */}
        <div className="space-y-5">
          {/* Recent Activity */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`
                      w-2 h-2 rounded-full mt-2 flex-shrink-0
                      ${activity.type === 'trial' ? 'bg-purple-400' :
                        activity.type === 'customer' ? 'bg-green-400' :
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
            ) : (
              <div className="text-center py-6">
                <Icons.clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No recent activity</p>
              </div>
            )}
          </div>

          {/* User Role Info */}
          <div className="card p-5 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Access</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Role</span>
                <span className={`
                  px-3 py-1 rounded-full text-xs font-medium
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Access Level</span>
                <span className="text-sm font-medium text-gray-900">
                  {session.role === 'ADMIN' || session.role === 'OWNER' ? 'Full Access' : 'Standard'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Email</span>
                <span className="text-sm font-medium text-gray-900 truncate ml-2" title={session.email}>
                  {session.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get relative time
function getRelativeTime(date: Date | string | null): string {
  if (!date) return 'Unknown';

  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString('en-GB');
}
