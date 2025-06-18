// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Plug, Github, Mail, Calendar, FileSearch, Plus, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import type { SettingsState } from "~/core/store";
import type { Tab } from "./types";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  comingSoon?: boolean;
}

const integrations: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Connect your GitHub repositories",
    icon: <Github className="h-5 w-5" />,
    connected: false,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and search your Google Drive files",
    icon: <FileSearch className="h-5 w-5" />,
    connected: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Search and analyze your emails",
    icon: <Mail className="h-5 w-5" />,
    connected: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Access your calendar events",
    icon: <Calendar className="h-5 w-5" />,
    connected: true,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Search messages and channels",
    icon: <div className="h-5 w-5 bg-[#4A154B] rounded" />,
    connected: false,
    comingSoon: true,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Access your Notion workspace",
    icon: <div className="h-5 w-5 bg-black rounded" />,
    connected: false,
    comingSoon: true,
  },
];

export const IntegrationsTab: Tab = ({
  settings,
  onChange,
}: {
  settings: SettingsState;
  onChange: (changes: Partial<SettingsState>) => void;
}) => {
  const [connectedIntegrations, setConnectedIntegrations] = useState(integrations);

  const handleConnect = (integrationId: string) => {
    // In a real implementation, this would trigger OAuth flow
    setConnectedIntegrations(prev =>
      prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, connected: !integration.connected }
          : integration
      )
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-medium">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your everyday apps to enhance Omega Intelligence capabilities
        </p>
      </header>

      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-start gap-2">
          <div className="rounded-full bg-blue-100 p-1">
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm">
              By default, Omega Intelligence does not train models on your data.{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Learn more.
              </a>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              You control your data and can disconnect integrations anytime.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {connectedIntegrations.map((integration) => (
          <Card key={integration.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  {integration.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{integration.name}</h3>
                    {integration.comingSoon && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integration.connected ? (
                  <>
                    <span className="text-sm text-blue-600 font-medium">
                      Connected
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleConnect(integration.id)}
                      disabled={integration.comingSoon}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnect(integration.id)}
                    disabled={integration.comingSoon}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border-dashed">
        <button className="flex w-full items-center gap-3 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Add integration</h3>
            <p className="text-sm text-muted-foreground">
              Request a new integration
            </p>
          </div>
        </button>
      </Card>

      <div className="text-xs text-muted-foreground">
        <p>
          Integrations allow Omega Intelligence to access and search your data from various
          sources. All data is processed securely and never used for training unless
          explicitly permitted.
        </p>
      </div>
    </div>
  );
};

IntegrationsTab.displayName = "Integrations";
IntegrationsTab.icon = Plug;