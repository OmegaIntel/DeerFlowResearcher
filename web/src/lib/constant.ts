// ~/lib/constant.ts - Updated for ChatGPT-style navigation
import {
  LayoutDashboard,
  FolderOpen,
  User,
  Settings,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  isDynamic?: boolean; // Add this property
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
    href: '/chat', // Default route when Projects is clicked
    icon: FolderOpen,
    description: 'Your conversations and reports',
    isDynamic: true // This will show dynamic report history
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