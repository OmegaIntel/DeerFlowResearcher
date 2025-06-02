"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, LogOut, Menu, FileText, Plus, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { API_BASE_URL, SIDEBAR_NAV_ITEMS } from "~/lib/constant";
import { useAuth } from "~/hooks/use-auth";
import { useState, useEffect } from "react";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";

// Import the store functions
import { loadHistoricalReport, closeResearch, useStore, useIsHistoricalResearch } from "~/core/store";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface ReportItem {
  id: string;
  report_name: string;
  created_at: string;
}

// API function to fetch reports list
async function fetchUserReports(page: number = 1, limit: number = 20): Promise<{ reports: ReportItem[], total_count: number }> {
  // Get auth token from cookies
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('authToken='))
    ?.split('=')[1];

  if (!token) {
    return { reports: [], total_count: 0 };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/reports/my-reports?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }

    const data = await response.json();
    return {
      reports: data.reports ?? [],
      total_count: data.total_count ?? 0
    };
  } catch (error) {
    console.error('Error fetching reports:', error);
    return { reports: [], total_count: 0 };
  }
}

// API function to fetch single report by ID
async function fetchReportById(reportId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('authToken='))
    ?.split('=')[1];

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch report: ${response.statusText}`);
  }

  return await response.json();
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { logout, isAuthenticated } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(['projects']);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Get current research state from store to show/hide close button
  const isHistoricalResearch = useIsHistoricalResearch();

  // Fetch reports when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      loadReports();
    }
  }, []);

  const loadReports = async () => {
    setIsLoadingReports(true);
    try {
      const { reports } = await fetchUserReports(1, 10); // Load first 10 reports
      setReports(reports);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Handle report click - fetch full report and load into store
  const handleReportClick = async (report: ReportItem) => {
    try {
      console.log('Loading historical report:', report.report_name);
      
      // 1. Fetch full report data from API
      const fullReportData = await fetchReportById(report.id);
      
      // 2. Load into store (this will clear current chat and open research panel)
      loadHistoricalReport(fullReportData);
      
      console.log('Successfully loaded historical report into store');
      
    } catch (error) {
      console.error('Failed to load historical report:', error);
      // You could add a toast notification here if you have one
    }
  };

  // Handle closing historical report
  const handleCloseReport = () => {
    closeResearch();
    console.log('Closed historical report');
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const truncateReportName = (name: string, maxLength: number = 25) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderNavItems = () => (
    <TooltipProvider delayDuration={0}>
      {SIDEBAR_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = isItemActive(item.href);
        const isExpanded = expandedItems.includes(item.id);
        const isDynamic = item.isDynamic;

        if (isCollapsed) {
          // Collapsed view
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="icon"
                  className="h-10 w-full"
                  onClick={() => isDynamic ? toggleExpanded(item.id) : undefined}
                  asChild={!isDynamic}
                >
                  {isDynamic ? (
                    <div>
                      <Icon className="h-4 w-4" />
                    </div>
                  ) : (
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                    </Link>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {isDynamic && isExpanded && (
                    <div className="mt-2 max-w-xs">
                      {isLoadingReports ? (
                        <p className="text-xs text-muted-foreground">Loading...</p>
                      ) : reports.length > 0 ? (
                        <div className="space-y-1">
                          {reports.slice(0, 5).map(report => (
                            <div
                              key={report.id}
                              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={() => handleReportClick(report)}
                            >
                              {truncateReportName(report.report_name, 20)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No reports yet</p>
                      )}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        }

        // Expanded view
        return (
          <div key={item.id} className="space-y-1">
            {isDynamic ? (
              // Projects header with expand/collapse
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="default"
                  className="w-full justify-between text-muted-foreground"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-center">
                    <Icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded ? "rotate-180" : ""
                    )} 
                  />
                </Button>
                
                {/* New Chat Button and Close Report Button */}
                {isExpanded && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start ml-6"
                      asChild
                    >
                      <Link href="/chat">
                        <Plus className="mr-2 h-3 w-3" />
                        New Chat
                      </Link>
                    </Button>
                    
                    {/* Close Report Button - only show if historical report is open */}
                    {isHistoricalResearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start ml-6 text-muted-foreground hover:text-destructive"
                        onClick={handleCloseReport}
                      >
                        <X className="mr-2 h-3 w-3" />
                        Close Report
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : (
              // Regular navigation item
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="default"
                className="w-full justify-start"
                asChild
              >
                <Link href={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            )}

            {/* Render dynamic reports list */}
            {isDynamic && isExpanded && (
              <div className="ml-6 space-y-1">
                {isLoadingReports ? (
                  <div className="text-xs text-muted-foreground py-2">
                    Loading reports...
                  </div>
                ) : reports.length > 0 ? (
                  reports.map((report) => {
                    return (
                      <Tooltip key={report.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-auto py-2"
                            onClick={() => handleReportClick(report)}
                          >
                            <FileText className="mr-2 h-3 w-3 flex-shrink-0" />
                            <div className="flex-1 text-left overflow-hidden">
                              <div className="text-xs truncate">
                                {truncateReportName(report.report_name)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(report.created_at)}
                              </div>
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="max-w-xs">
                            <p className="font-medium text-sm">{report.report_name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground py-2">
                    No reports yet. Start a new chat to create your first report!
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </TooltipProvider>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "bg-background relative hidden h-screen flex-col border-r transition-all duration-300 md:flex",
          isCollapsed ? "w-[80px]" : "w-[280px]",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <h1 className="overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap">
              Omega Intelligence
            </h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="ml-auto"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">{renderNavItems()}</nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={isCollapsed ? "icon" : "default"}
                  className={cn(
                    "text-destructive hover:text-destructive w-full",
                    isCollapsed ? "h-10 w-10" : "justify-start",
                  )}
                  onClick={logout}
                >
                  <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                  {!isCollapsed && "Logout"}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Logout</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <MobileSidebar 
          onLogout={logout} 
          reports={reports} 
          isLoadingReports={isLoadingReports} 
          onReportClick={handleReportClick}
          onCloseReport={handleCloseReport}
          isHistoricalResearch={isHistoricalResearch}
        />
      </div>
    </>
  );
}

function MobileSidebar({ 
  onLogout, 
  reports, 
  isLoadingReports,
  onReportClick,
  onCloseReport,
  isHistoricalResearch
}: { 
  onLogout: () => void;
  reports: ReportItem[];
  isLoadingReports: boolean;
  onReportClick: (report: ReportItem) => void;
  onCloseReport: () => void;
  isHistoricalResearch: boolean;
}) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['projects']);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const truncateReportName = (name: string, maxLength: number = 30) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-40 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b px-4">
            <h2 className="text-sm font-semibold">Navigation</h2>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              {SIDEBAR_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isExpanded = expandedItems.includes(item.id);
                const isDynamic = item.isDynamic;

                return (
                  <div key={item.id} className="space-y-1">
                    <Button
                      variant="ghost"
                      size="default"
                      className="w-full justify-between"
                      onClick={() => isDynamic ? toggleExpanded(item.id) : undefined}
                      asChild={!isDynamic}
                    >
                      {isDynamic ? (
                        <>
                          <div className="flex items-center">
                            <Icon className="mr-2 h-4 w-4" />
                            {item.title}
                          </div>
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isExpanded ? "rotate-180" : ""
                            )} 
                          />
                        </>
                      ) : (
                        <Link href={item.href}>
                          <Icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Link>
                      )}
                    </Button>

                    {isDynamic && isExpanded && (
                      <div className="ml-6 space-y-1">
                        {/* New Chat Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          asChild
                        >
                          <Link href="/chat">
                            <Plus className="mr-2 h-3 w-3" />
                            New Chat
                          </Link>
                        </Button>

                        {/* Close Report Button - only show if historical report is open */}
                        {isHistoricalResearch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground hover:text-destructive"
                            onClick={onCloseReport}
                          >
                            <X className="mr-2 h-3 w-3" />
                            Close Report
                          </Button>
                        )}

                        {/* Reports List */}
                        {isLoadingReports ? (
                          <div className="text-xs text-muted-foreground py-2">
                            Loading reports...
                          </div>
                        ) : reports.length > 0 ? (
                          reports.map((report) => {
                            return (
                              <Button
                                key={report.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-auto py-2"
                                onClick={() => onReportClick(report)}
                              >
                                <FileText className="mr-2 h-3 w-3 flex-shrink-0" />
                                <div className="flex-1 text-left overflow-hidden">
                                  <div className="text-xs truncate">
                                    {truncateReportName(report.report_name)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(report.created_at)}
                                  </div>
                                </div>
                              </Button>
                            );
                          })
                        ) : (
                          <div className="text-xs text-muted-foreground py-2">
                            No reports yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-4">
            <Button
              variant="ghost"
              size="default"
              className="text-destructive hover:text-destructive w-full justify-start"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}