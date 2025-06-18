'use client';

import { useState, useEffect } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { IntegrationsDialog } from './integrations-dialog';
import { 
  Box, 
  Cloud, 
  FileText, 
  Mail, 
  Database,
  Building2,
  FolderOpen,
  Globe,
  Zap,
  Calendar,
  Code,
  Plug,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { getAuthToken } from '~/services/auth';
import { resolveServiceURL } from '~/core/api/resolve-service-url';

interface Integration {
  id: string;
  service_type: string;
  service_name: string;
  enabled: boolean;
  is_connected: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  last_synced_at?: string;
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  'box': Box,
  'dropbox': Cloud,
  'google-drive': FolderOpen,
  'microsoft-outlook': Mail,
  'microsoft-onedrive': Cloud,
  'microsoft-sharepoint': FileText,
  'salesforce': Database,
};

const SERVICE_COLORS: Record<string, string> = {
  'box': 'bg-blue-100 text-blue-600',
  'dropbox': 'bg-blue-100 text-blue-600',
  'google-drive': 'bg-green-100 text-green-600',
  'microsoft-outlook': 'bg-blue-100 text-blue-600',
  'microsoft-onedrive': 'bg-blue-100 text-blue-600',
  'microsoft-sharepoint': 'bg-purple-100 text-purple-600',
  'salesforce': 'bg-indigo-100 text-indigo-600',
};

export function IntegrationsList() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [vaultUrl, setVaultUrl] = useState<string | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [connectingService, setConnectingService] = useState<string>('');

  useEffect(() => {
    console.log('[IntegrationsList] Component mounted, loading integrations...');
    loadIntegrations();
    
    // Check if we're coming back from a connection
    const searchParams = new URLSearchParams(window.location.search);
    const connectedService = searchParams.get('connected');
    if (connectedService) {
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=integrations');
      
      // Check connection status after OAuth callback
      checkConnectionStatus(connectedService);
    }
  }, []);

  const loadIntegrations = async () => {
    try {
      const token = getAuthToken();
      console.log('[IntegrationsList] Loading integrations with token:', token ? 'present' : 'missing');
      
      const response = await fetch(resolveServiceURL('/integrations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[IntegrationsList] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[IntegrationsList] Loaded integrations:', data);
        setIntegrations(data);
      } else {
        const errorText = await response.text();
        console.error('[IntegrationsList] Failed to load integrations:', response.status, errorText);
        toast.error('Failed to load integrations');
      }
    } catch (error) {
      console.error('[IntegrationsList] Error loading integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (serviceType: string) => {
    try {
      const token = getAuthToken();
      console.log('[IntegrationsList] Enabling integration:', serviceType);
      console.log('[IntegrationsList] Token present:', !!token);
      
      const url = resolveServiceURL(`/integrations/${serviceType}/enable`);
      console.log('[IntegrationsList] Request URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[IntegrationsList] Response status:', response.status);
      
      if (response.ok) {
        toast.success('Integration enabled');
        loadIntegrations();
      } else {
        const errorText = await response.text();
        console.error('[IntegrationsList] Enable failed:', response.status, errorText);
        toast.error('Failed to enable integration');
      }
    } catch (error) {
      console.error('Error enabling integration:', error);
      toast.error('Failed to enable integration');
    }
  };

  const handleDisable = async (serviceType: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(resolveServiceURL(`/integrations/${serviceType}/disable`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Integration disabled');
        loadIntegrations();
      } else {
        toast.error('Failed to disable integration');
      }
    } catch (error) {
      console.error('Error disabling integration:', error);
      toast.error('Failed to disable integration');
    }
  };

  const handleConnect = async (serviceType: string) => {
    setConnecting(serviceType);
    setConnectingService(serviceType);
    console.log('[IntegrationsList] Connecting integration:', serviceType);
    try {
      const token = getAuthToken();
      console.log('[IntegrationsList] Token for connect:', !!token);
      const response = await fetch(resolveServiceURL(`/integrations/${serviceType}/connect`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[IntegrationsList] Connect response:', data);
        // Open vault URL in dialog to keep Omega platform visible in background
        if (data.vault_url) {
          // Use window.open with specific features to create a popup dialog-like experience
          const popup = window.open(
            data.vault_url,
            'apideck-vault',
            'width=900,height=700,scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no,location=no'
          );
          
          if (popup) {
            toast.success('Opening connection window...');
            
            // Monitor popup and reload integrations when closed
            const checkClosed = setInterval(() => {
              if (popup.closed) {
                clearInterval(checkClosed);
                toast.info('Connection window closed. Refreshing integrations...');
                setTimeout(() => {
                  loadIntegrations();
                }, 1000);
              }
            }, 1000);
          } else {
            toast.error('Popup blocked. Please allow popups for this site.');
          }
        } else {
          console.error('[IntegrationsList] No vault_url in response:', data);
          toast.error('Failed to get connection URL');
        }
      } else {
        const errorText = await response.text();
        console.error('[IntegrationsList] Connect failed:', response.status, errorText);
        toast.error('Failed to connect integration');
      }
    } catch (error) {
      console.error('Error connecting integration:', error);
      toast.error('Failed to connect integration');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (serviceType: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(resolveServiceURL(`/integrations/${serviceType}/disconnect`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Integration disconnected');
        loadIntegrations();
      } else {
        toast.error('Failed to disconnect integration');
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  const checkConnectionStatus = async (serviceType: string) => {
    console.log('[IntegrationsList] Checking connection status for:', serviceType);
    try {
      const token = getAuthToken();
      const response = await fetch(resolveServiceURL(`/integrations/${serviceType}/check-connection`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[IntegrationsList] Connection status:', data);
        
        if (data.status === 'connected') {
          toast.success(`Successfully connected to ${serviceType}${data.account_name ? ` (${data.account_name})` : ''}`);
        } else if (data.status === 'not_connected') {
          toast.info('Authorization was cancelled or incomplete');
        } else {
          toast.error('Failed to verify connection status');
        }
        
        // Reload integrations to show updated status
        loadIntegrations();
      } else {
        toast.error('Failed to check connection status');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      toast.error('Failed to check connection status');
    }
  };

  const handleCloseVault = () => {
    setIsVaultOpen(false);
    setVaultUrl(null);
    setConnectingService('');
    // Reload integrations to check if connection was successful
    loadIntegrations();
  };

  // Handle iframe messages for OAuth callback detection
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[IntegrationsList] Received message:', event.data, 'from:', event.origin);
      
      // Handle messages from our callback page or APIdeck vault
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'success') {
          console.log('[IntegrationsList] OAuth success detected');
          toast.success(`Successfully connected to ${event.data.service || connectingService}`);
          
          // Check connection status after a brief delay
          setTimeout(() => {
            if (connectingService) {
              checkConnectionStatus(connectingService);
            }
          }, 1000);
        } else if (event.data.type === 'close') {
          console.log('[IntegrationsList] Closing vault dialog');
          handleCloseVault();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [connectingService]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Separate enterprise integrations from existing ones
  const enterpriseIntegrations = integrations.filter(int => 
    ['box', 'dropbox', 'google-drive', 'microsoft-outlook', 'microsoft-onedrive', 'microsoft-sharepoint', 'salesforce'].includes(int.service_type)
  );
  
  console.log('[IntegrationsList] Rendering with integrations:', integrations);
  console.log('[IntegrationsList] Enterprise integrations:', enterpriseIntegrations);

  return (
    <div className="space-y-4">
      {/* Enterprise Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Integrations</CardTitle>
          <CardDescription>Connect your business tools and services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {enterpriseIntegrations.map((integration) => {
              const Icon = SERVICE_ICONS[integration.service_type] || Building2;
              const colorClass = SERVICE_COLORS[integration.service_type] || 'bg-gray-100 text-gray-600';
              
              return (
                <div key={integration.service_type} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{integration.service_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {integration.metadata?.description || 'Enterprise cloud service'}
                      </p>
                      {integration.is_connected && integration.metadata?.account && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Connected: {integration.metadata.account}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.enabled && (
                      <>
                        {integration.is_connected ? (
                          <>
                            <Badge variant="secondary">Connected</Badge>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDisconnect(integration.service_type)}
                            >
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleConnect(integration.service_type)}
                            disabled={connecting === integration.service_type}
                          >
                            {connecting === integration.service_type ? 'Opening...' : 'Connect'}
                          </Button>
                        )}
                      </>
                    )}
                    <Switch
                      checked={integration.enabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleEnable(integration.service_type);
                        } else {
                          handleDisable(integration.service_type);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Existing Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Integrations</CardTitle>
          <CardDescription>Manage your connected services and tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Web Search */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Web Search</h4>
                  <p className="text-xs text-muted-foreground">Search the web for real-time information</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Connected</Badge>
                <Button size="sm" variant="ghost">Configure</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API & Developer Tools */}
      <Card>
        <CardHeader>
          <CardTitle>API & Developer Tools</CardTitle>
          <CardDescription>Advanced integrations for developers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Code className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Custom API Integration</h4>
                  <p className="text-xs text-muted-foreground">Connect your own APIs and services</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast.info('Custom API integration coming soon')}>
                Coming Soon
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Plug className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Webhooks</h4>
                  <p className="text-xs text-muted-foreground">Receive real-time updates via webhooks</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast.info('Webhooks coming soon')}>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* APIdeck Vault Dialog */}
      <IntegrationsDialog
        isOpen={isVaultOpen}
        onClose={handleCloseVault}
        vaultUrl={vaultUrl}
        serviceName={connectingService.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      />
    </div>
  );
}