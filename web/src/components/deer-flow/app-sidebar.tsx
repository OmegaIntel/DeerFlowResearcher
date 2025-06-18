"use client";

import {
  BookOpen,
  Bot,
  ChevronUp,
  Command,
  Folder,
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
import { useCurrentUser } from "~/hooks/use-current-user";
import { startNewChat } from "~/core/store";
import { ProjectSwitcher } from "~/components/projects/project-switcher";

import { LogoIcon } from "./logo";

// Menu items.
const data = {
  navMain: [
    {
      title: "Chat",
      url: "/chat",
      icon: Bot,
      isActive: true,
    },
    {
      title: "Chat History",
      url: "/chat-history",
      icon: BookOpen,
    },
    {
      title: "Documents",
      url: "/documents",
      icon: Frame,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: Folder,
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
  const { user: currentUser, loading } = useCurrentUser();
  const [isAuth, setIsAuth] = useState(false);
  const [currentProject, setCurrentProject] = useState<string | null>(null);

  useEffect(() => {
    // Simple auth check using token presence
    const checkAuth = () => {
      const token = getToken();
      const authStatus = !!token;
      setIsAuth(authStatus);
    };

    // Initial check
    checkAuth();

    // Set up periodic check
    const interval = setInterval(checkAuth, 2000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent infinite loops

  const handleLogout = () => {
    logout();
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleChatClick = () => {
    startNewChat();
    router.push('/chat');
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
                <div className="flex flex-1 items-center text-left">
                  <span className="truncate font-semibold text-base">Omega Intelligence</span>
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
                {item.title === "Chat" ? (
                  <SidebarMenuButton tooltip={item.title} onClick={handleChatClick}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton tooltip={item.title} asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
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
      
      
      <SidebarRail />
    </Sidebar>
  );
}