import { UserRole } from './auth';

export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  roles: UserRole[];
  description?: string;
}

export interface BreadcrumbItem {
  name: string;
  href?: string;
}