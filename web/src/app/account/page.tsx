'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mail, User, Calendar, Clock, Shield, Bell } from 'lucide-react';

import { AppSidebar } from "~/components/deer-flow/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Switch } from "~/components/ui/switch";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { useCurrentUser } from "~/hooks/use-current-user";
import { useAuth } from "~/hooks/use-auth";
import { getAuthToken } from "~/services/auth";
import { toast } from "sonner";
import { resolveServiceURL } from "~/core/api/resolve-service-url";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { logout } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  
  console.log('[AccountPage] Rendering, user:', user, 'loading:', loading);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const token = getAuthToken();
      const response = await fetch(resolveServiceURL('/users/me'), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
        }),
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsUpdating(true);
    try {
      const token = getAuthToken();
      const response = await fetch(resolveServiceURL('/users/change-password'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(resolveServiceURL('/users/me'), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Account deleted successfully');
        logout();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete account');
      }
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!user) {
    console.log('[AccountPage] No user found, redirecting to login');
    router.push('/auth/login');
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center gap-4 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Account Settings</h1>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Profile Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>Your account information at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-2xl font-medium">
                        {(user.full_name || user.email)?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 h-6 w-6 rounded-full"
                      onClick={() => toast.info('Profile picture upload coming soon')}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">{user.full_name || 'No name set'}</h2>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Member since {user.created_at ? 'Recently' : 'Unknown'}
                      </span>
                      {user.oauth_provider && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Signed in with {user.oauth_provider}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for different sections */}
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="danger">Danger Zone</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                    <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                      {isUpdating ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-4">
                {!user.oauth_provider && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>Update your password to keep your account secure</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                      <Button onClick={handleChangePassword} disabled={isUpdating}>
                        {isUpdating ? 'Changing...' : 'Change Password'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" onClick={() => toast.info('2FA coming soon')}>
                      Enable Two-Factor Authentication
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Active Sessions</CardTitle>
                    <CardDescription>Manage your active sessions across devices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Current Session</p>
                            <p className="text-xs text-muted-foreground">Active now</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" disabled>
                          Current
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Preferences</CardTitle>
                    <CardDescription>Manage how we communicate with you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emailNotifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications about your account activity</p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketingEmails">Marketing Emails</Label>
                        <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
                      </div>
                      <Switch
                        id="marketingEmails"
                        checked={marketingEmails}
                        onCheckedChange={setMarketingEmails}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="securityAlerts">Security Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified about important security updates</p>
                      </div>
                      <Switch
                        id="securityAlerts"
                        checked={securityAlerts}
                        onCheckedChange={setSecurityAlerts}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Danger Zone Tab */}
              <TabsContent value="danger" className="space-y-4">
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive">Delete Account</CardTitle>
                    <CardDescription>Permanently delete your account and all associated data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button variant="destructive" onClick={handleDeleteAccount}>
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}