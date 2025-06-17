"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Plus, FolderOpen } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import type { Project } from "~/core/api/projects";
import { getProjects, PROJECT_ICONS } from "~/core/api/projects";

interface ProjectSwitcherProps {
  currentProjectId?: string;
  onProjectSelect?: (project: Project | null) => void;
  onCreateProject?: () => void;
  onManageProjects?: () => void;
  compact?: boolean;
}

export function ProjectSwitcher({
  currentProjectId,
  onProjectSelect,
  onCreateProject,
  onManageProjects,
  compact = false,
}: ProjectSwitcherProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const fetchProjects = async () => {
    try {
      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getIconEmoji = (iconId: string) => {
    const icon = PROJECT_ICONS.find(i => i.id === iconId);
    return icon?.emoji || "📁";
  };

  const displayText = currentProject ? currentProject.name : "All Projects";
  const displayIcon = currentProject ? getIconEmoji(currentProject.icon || "folder") : "📂";

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`justify-start gap-2 ${compact ? "h-8 px-2" : "h-10 px-3"}`}
        >
          <span className="text-base">{displayIcon}</span>
          {!compact && (
            <>
              <span className="font-medium truncate max-w-[120px]">{displayText}</span>
              <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
            </>
          )}
          {compact && <ChevronDown className="h-3 w-3" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* All Projects option */}
        <DropdownMenuItem
          onClick={() => onProjectSelect?.(null)}
          className={!currentProjectId ? "bg-muted" : ""}
        >
          <span className="mr-2 text-base">📂</span>
          <div className="flex-1">
            <div className="font-medium">All Projects</div>
            <div className="text-xs text-muted-foreground">View all content</div>
          </div>
        </DropdownMenuItem>

        {projects.length > 0 && <DropdownMenuSeparator />}

        {/* Project list */}
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => onProjectSelect?.(project)}
            className={currentProjectId === project.id ? "bg-muted" : ""}
          >
            <span className="mr-2 text-base">{getIconEmoji(project.icon || "folder")}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{project.name}</span>
                {project.color && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {project.session_count} chats • {project.document_count} docs
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem onClick={onCreateProject}>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </DropdownMenuItem>
        
        {onManageProjects && (
          <DropdownMenuItem onClick={onManageProjects}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Manage Projects
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}