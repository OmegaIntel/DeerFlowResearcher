'use client';

import { User, Settings, LifeBuoy, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useAuth } from "~/hooks/use-auth";
import { useCurrentUser } from "~/hooks/use-current-user";
import { SettingsDialogControlled } from "./settings-dialog-controlled";
export function UserDropdown() {
  const { logout } = useAuth();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (loading || !user) {
    return null;
  }

  // Get first letter of name or email
  const initial = (user.full_name || user.email)?.[0]?.toUpperCase() || 'U';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full"
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-sm font-medium">{initial}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.full_name || user.email.split('@')[0]}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/account')}>
            <User className="mr-2 h-4 w-4" />
            <span>Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => {
            console.log('[UserDropdown] Support clicked - placeholder');
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
      <SettingsDialogControlled open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}