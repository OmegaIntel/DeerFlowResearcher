"use client";

import { useState, useEffect } from "react";
import { Plus, MoreVertical, Settings, Archive, Trash2, Edit } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";

import type {
  Project,
  CreateProjectData,
  UpdateProjectData,
} from "~/core/api/projects";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  PROJECT_COLORS,
  PROJECT_ICONS,
} from "~/core/api/projects";

interface ProjectManagerProps {
  currentProjectId?: string;
  onProjectSelect?: (project: Project | null) => void;
}

export function ProjectManager({ currentProjectId, onProjectSelect }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateProjectData>({
    name: "",
    description: "",
    color: PROJECT_COLORS[0],
    icon: PROJECT_ICONS[0]?.id || "folder",
  });

  const fetchProjects = async () => {
    try {
      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      const newProject = await createProject(formData);
      setProjects([newProject, ...projects]);
      setCreateDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        color: PROJECT_COLORS[0],
        icon: PROJECT_ICONS[0]?.id || "folder",
      });
      toast.success("Project created successfully");
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project");
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      const updatedProject = await updateProject(editingProject.id, formData);
      setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
      setEditDialogOpen(false);
      setEditingProject(null);
      toast.success("Project updated successfully");
    } catch (error) {
      console.error("Failed to update project:", error);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This will move all content to no project.`)) {
      return;
    }

    try {
      await deleteProject(project.id);
      setProjects(projects.filter(p => p.id !== project.id));
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleArchiveProject = async (project: Project) => {
    try {
      await archiveProject(project.id);
      setProjects(projects.filter(p => p.id !== project.id));
      toast.success("Project archived successfully");
    } catch (error) {
      console.error("Failed to archive project:", error);
      toast.error("Failed to archive project");
    }
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      color: project.color || PROJECT_COLORS[0],
      icon: project.icon || PROJECT_ICONS[0]?.id || "folder",
    });
    setEditDialogOpen(true);
  };

  const getIconEmoji = (iconId: string) => {
    const icon = PROJECT_ICONS.find(i => i.id === iconId);
    return icon?.emoji || "📁";
  };

  if (loading) {
    return <div className="p-4">Loading projects...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Organize your chats and documents into projects for better organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your project"
                  rows={3}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? "border-gray-900 dark:border-gray-100" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Icon</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {PROJECT_ICONS.map((icon) => (
                    <button
                      key={icon.id}
                      className={`p-2 text-lg rounded border ${
                        formData.icon === icon.id ? "border-gray-900 dark:border-gray-100 bg-muted" : "border-gray-300"
                      }`}
                      onClick={() => setFormData({ ...formData, icon: icon.id })}
                    >
                      {icon.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {/* No Project option */}
        <div
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            !currentProjectId ? "bg-muted border-gray-900 dark:border-gray-100" : "bg-card hover:bg-muted/50"
          }`}
          onClick={() => onProjectSelect?.(null)}
        >
          <div className="flex items-center gap-3">
            <div className="text-lg">📂</div>
            <div className="flex-1">
              <p className="font-medium">All Projects</p>
              <p className="text-xs text-muted-foreground">View all content</p>
            </div>
          </div>
        </div>

        {/* Project list */}
        {projects.map((project) => (
          <div
            key={project.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors group ${
              currentProjectId === project.id ? "bg-muted border-gray-900 dark:border-gray-100" : "bg-card hover:bg-muted/50"
            }`}
            onClick={() => onProjectSelect?.(project)}
          >
            <div className="flex items-center gap-3">
              <div className="text-lg">{getIconEmoji(project.icon || "folder")}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{project.name}</p>
                  {project.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {project.session_count} chats
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {project.document_count} docs
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(project);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveProject(project);
                  }}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your project"
                rows={3}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-gray-900 dark:border-gray-100" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {PROJECT_ICONS.map((icon) => (
                  <button
                    key={icon.id}
                    className={`p-2 text-lg rounded border ${
                      formData.icon === icon.id ? "border-gray-900 dark:border-gray-100 bg-muted" : "border-gray-300"
                    }`}
                    onClick={() => setFormData({ ...formData, icon: icon.id })}
                  >
                    {icon.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProject}>Update Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}