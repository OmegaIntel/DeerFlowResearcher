"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Menu } from "lucide-react";
import { cn } from "~/lib/utils";
import { SIDEBAR_NAV_ITEMS } from "~/lib/constant";
import { useAuth } from "~/hooks/use-auth";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const renderNavItems = () => (
    <TooltipProvider delayDuration={0}>
      {SIDEBAR_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return isCollapsed ? (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="icon"
                className="h-10 w-full"
                asChild
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.title}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            key={item.id}
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
        <MobileSidebar onLogout={logout} />
      </div>
    </>
  );
}

function MobileSidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();

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
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Button
                    key={item.id}
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
