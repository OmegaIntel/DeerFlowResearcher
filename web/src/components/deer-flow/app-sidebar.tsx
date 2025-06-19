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
import { SettingsDialogControlled } from "./settings-dialog-controlled";

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
  const [showSettings, setShowSettings] = useState(false);

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

  const handleChatClick = async () => {
    console.log('[AppSidebar] handleChatClick called');
    
    try {
      // Start new chat and get the thread ID
      await startNewChat();
      
      // Get the new thread ID from the store
      const state = (await import('~/core/store')).useStore.getState();
      const newThreadId = state.threadId;
      console.log('[AppSidebar] New thread ID:', newThreadId);
      
      // Navigate to chat with the thread ID in the URL
      if (newThreadId) {
        router.push(`/chat?thread=${newThreadId}`);
      } else {
        router.push('/chat');
      }
    } catch (error) {
      console.error('[AppSidebar] Error in handleChatClick:', error);
      // Navigate anyway
      router.push('/chat');
    }
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
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-sm font-medium">
                        {(currentUser.full_name || currentUser.email)?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="truncate font-semibold">
                        {currentUser.full_name || currentUser.email.split('@')[0]}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {currentUser.email}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {currentUser.full_name || currentUser.email.split('@')[0]}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/account')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowSettings(true)}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => {
                    console.log('[AppSidebar] Support clicked - placeholder');
                    // TODO: Implement support action
                  }}>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg" onClick={handleLogin}>
                <User className="h-5 w-5" />
                <span>Sign In</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
      <SettingsDialogControlled open={showSettings} onOpenChange={setShowSettings} />
    </Sidebar>
  );
}