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

  // Define routes where sidebar should NOT appear
  const noSidebarRoutes = ['/', '/auth/login', '/auth/register'];
  
  // Check if current path matches any no-sidebar route
  const showSidebar = !noSidebarRoutes.some(route => 
    pathname === route || pathname.startsWith('/auth/')
  );

  // Avoid hydration mismatch by not rendering until client-side
  if (isLoading) {
    return <>{children}</>;
  }

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isCollapsed={isCollapsed} 
        onToggleCollapse={handleToggleCollapse} 
      />
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300",
        "md:ml-0" // Sidebar handles its own spacing
      )}>
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}