import {
  LayoutDashboard,
  FolderOpen,
  User,
  Settings,
  type LucideIcon
} from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  // {
  //   id: 'dashboard',
  //   title: 'Dashboard',
  //   href: '/dashboard',
  //   icon: LayoutDashboard,
  //   description: 'Overview and analytics'
  // },
  {
    id: 'projects',
    title: 'Projects',
    href: '/chat',
    icon: FolderOpen,
    description: 'Manage your projects'
  },
  // {
  //   id: 'profile',
  //   title: 'Profile',
  //   href: '/profile',
  //   icon: User,
  //   description: 'Your account settings'
  // },
  // {
  //   id: 'settings',
  //   title: 'Settings',
  //   href: '/settings',
  //   icon: Settings,
  //   description: 'Application preferences'
  // }
];

// Routes where sidebar should not be displayed
export const NO_SIDEBAR_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
];

// Route prefixes where sidebar should not be displayed
export const NO_SIDEBAR_ROUTE_PREFIXES = [
  '/auth/'
];

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const CORESIGNAL_API_KEY = process.env.NEXT_PUBLIC_CORESIGNAL_API_KEY;