'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '~/lib/utils';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setIsCollapsed(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  // Save collapsed state to localStorage
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  // Routes where sidebar should be hidden
  const noSidebarRoutes = ['/', '/auth/login', '/auth/register'];
  const showSidebar = !noSidebarRoutes.some(route =>
    pathname === route || pathname.startsWith('/auth/')
  );

  if (isLoading) return <>{children}</>;
  if (!showSidebar) return <>{children}</>;

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <main
        className={cn(
          'flex-1 overflow-y-auto transition-all duration-300'
        )}
      >
        <div className="min-h-screen px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
