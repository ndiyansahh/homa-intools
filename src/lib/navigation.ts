import { NavigationItem, BreadcrumbItem } from '@/types/navigation';
import { UserRole } from '@/types/auth';

export const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/app/dashboard',
    icon: 'dashboard',
    roles: ['ADMIN', 'OWNER', 'STAFF'],
    description: 'Overview and analytics'
  },
  {
    name: 'Trial',
    href: '/app/trial',
    icon: 'beaker',
    roles: ['ADMIN', 'OWNER', 'STAFF'],
    description: 'Trial management'
  },
  {
    name: 'Mitra',
    href: '/app/mitra',
    icon: 'users',
    roles: ['ADMIN', 'OWNER', 'STAFF'],
    description: 'Partner management'
  },
  {
    name: 'Customers',
    href: '/app/customers',
    icon: 'users',
    roles: ['ADMIN', 'OWNER', 'STAFF'],
    description: 'Customer and visit tracking'
  },
  {
    name: 'Attendance',
    href: '/app/attendance',
    icon: 'clock',
    roles: ['ADMIN', 'OWNER', 'STAFF'],
    description: 'Staff attendance management'
  },
  {
    name: 'Payouts',
    href: '/app/payouts',
    icon: 'currency',
    roles: ['ADMIN', 'OWNER', 'STAFF'],
    description: 'Payment and payout management'
  },
  {
    name: 'Settings',
    href: '/app/settings',
    icon: 'cog',
    roles: ['ADMIN', 'OWNER'],
    description: 'System configuration'
  }
];

export function getVisibleNavItems(userRole: UserRole): NavigationItem[] {
  return navigationItems.filter(item => item.roles.includes(userRole));
}

export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  let currentPath = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Skip the 'app' segment in breadcrumbs
    if (segment === 'app') continue;
    
    // Find matching navigation item for better naming
    const navItem = navigationItems.find(item => item.href === currentPath);
    
    breadcrumbs.push({
      name: navItem ? navItem.name : segment.charAt(0).toUpperCase() + segment.slice(1),
      href: i === segments.length - 1 ? undefined : currentPath // Don't link the current page
    });
  }
  
  return breadcrumbs;
}