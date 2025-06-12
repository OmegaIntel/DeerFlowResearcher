"use client";

import {
  BookOpen,
  Bot,
  ChevronUp,
  Command,
  Frame,
  LifeBuoy,
  LogOut,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";
import { useAuth } from "~/hooks/use-auth";

import { LogoIcon } from "./logo";

// Menu items.
const data = {
  navMain: [
    {
      title: "Chat",
      url: "/chat",
      icon: Bot,
      isActive: true,
      items: [
        {
          title: "New Chat",
          url: "/chat",
        },
        {
          title: "Chat History",
          url: "/chat/history",
        },
      ],
    },
    {
      title: "Research",
      url: "/research",
      icon: BookOpen,
      items: [
        {
          title: "New Research",
          url: "/chat?mode=research",
        },
        {
          title: "Research History",
          url: "/research/history",
        },
      ],
    },
    {
      title: "Documents",
      url: "/documents",
      icon: Frame,
      items: [
        {
          title: "Upload Files",
          url: "/documents/upload",
        },
        {
          title: "Document Search",
          url: "/chat?tool=documents",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Settings",
      url: "/settings",
      icon: Settings2,
    },
    {
      name: "API Keys",
      url: "/settings/api-keys",
      icon: Command,
    },
    {
      name: "MCP Servers",
      url: "/settings/mcp",
      icon: SquareTerminal,
    },
  ],
};

interface User {
  name: string;
  email: string;
  avatar?: string;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { getToken, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    // Simple auth check using token presence
    const checkAuth = () => {
      const token = getToken();
      const authStatus = !!token;
      
      setIsAuth(authStatus);
      
      if (authStatus) {
        // Get user info if authenticated
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          try {
            setUser(JSON.parse(userInfo));
          } catch {
            setUser({
              name: "User",
              email: "user@example.com",
            });
          }
        } else {
          setUser({
            name: "User",
            email: "user@example.com",
          });
        }
      } else {
        setUser(null);
      }
    };

    // Initial check
    checkAuth();

    // Set up periodic check
    const interval = setInterval(checkAuth, 2000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent infinite loops

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/chat">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LogoIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Omega Intelligence</span>
                  <span className="truncate text-xs">AI Research Assistant</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Tools & Settings</SidebarGroupLabel>
          <SidebarMenu>
            {data.projects.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isAuth && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <User className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <User className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user.name}</span>
                        <span className="truncate text-xs">{user.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings2 />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LifeBuoy />
                    Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={handleLogin}
                className="w-full justify-start"
                variant="ghost"
              >
                <User className="mr-2 size-4" />
                Sign In
              </Button>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}