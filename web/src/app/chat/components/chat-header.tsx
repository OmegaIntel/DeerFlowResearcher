// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { GithubOutlined } from "@ant-design/icons";
import Link from "next/link";
import { Suspense, useState, useEffect } from "react";

import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { ProjectSwitcher } from "~/components/projects/project-switcher";
import { getProjects } from "~/core/api/projects";
import type { Project } from "~/core/api/projects";
import { useStore } from "~/core/store";

import { ThemeToggle } from "../../../components/deer-flow/theme-toggle";
import { Tooltip } from "../../../components/deer-flow/tooltip";
import { SettingsDialog } from "../../settings/dialogs/settings-dialog";

export function ChatHeader() {
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const setSessionProject = useStore((state) => state.setSessionProject);
  const sessionProject = useStore((state) => state.sessionProject);

  useEffect(() => {
    setCurrentProject(sessionProject);
  }, [sessionProject]);

  const handleProjectSelect = (project: Project | null) => {
    const projectId = project?.id || null;
    setCurrentProject(projectId);
    setSessionProject(projectId);
  };

  return (
    <header className="flex h-12 w-full items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-lg font-semibold">Chat</h1>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Project Switcher for new chats */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Project:</span>
          <ProjectSwitcher
            currentProjectId={currentProject || undefined}
            onProjectSelect={handleProjectSelect}
            compact={true}
          />
        </div>
        
        <div className="flex items-center">
          <Tooltip title="Connect with us">
            <Button variant="ghost" size="icon" asChild>
              <Link
                href="https://www.omegaintelligence.ai/"
                target="_blank"
              >
                <GithubOutlined />
              </Link>
            </Button>
          </Tooltip>
          <ThemeToggle />
          <Suspense>
            <SettingsDialog />
          </Suspense>
        </div>
      </div>
    </header>
  );
}