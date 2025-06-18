'use client';

import { useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { 
  Box, 
  Cloud, 
  FileText, 
  Mail, 
  Database,
  Building2,
  FolderOpen,
  Globe,
  Code,
  Plug
} from 'lucide-react';
import { toast } from 'sonner';

const ENTERPRISE_SERVICES = [
  {
    id: 'box',
    name: 'Box',
    description: 'Cloud content management and file sharing',
    icon: Box,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Cloud storage and file synchronization',
    icon: Cloud,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Cloud storage and file management',
    icon: FolderOpen,
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'microsoft-outlook',
    name: 'Microsoft Outlook',
    description: 'Email and calendar management',
    icon: Mail,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'microsoft-onedrive',
    name: 'OneDrive',
    description: 'Microsoft cloud storage',
    icon: Cloud,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'microsoft-sharepoint',
    name: 'SharePoint',
    description: 'Document management and collaboration',
    icon: FileText,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Customer relationship management',
    icon: Database,
    color: 'bg-indigo-100 text-indigo-600'
  }
];

export function IntegrationsListStatic() {
  const [enabledServices, setEnabledServices] = useState<Record<string, boolean>>({});

  const handleToggle = (serviceId: string) => {
    setEnabledServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
    toast.info(`${enabledServices[serviceId] ? 'Disabled' : 'Enabled'} ${ENTERPRISE_SERVICES.find(s => s.id === serviceId)?.name}`);
  };

  const handleConnect = (serviceId: string) => {
    toast.info(`Connect functionality for ${ENTERPRISE_SERVICES.find(s => s.id === serviceId)?.name} coming soon!`);
  };

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
            {ENTERPRISE_SERVICES.map((service) => {
              const Icon = service.icon;
              const isEnabled = enabledServices[service.id] || false;
              
              return (
                <div key={service.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${service.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{service.name}</h4>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEnabled && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleConnect(service.id)}
                      >
                        Connect
                      </Button>
                    )}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(service.id)}
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
    </div>
  );
}