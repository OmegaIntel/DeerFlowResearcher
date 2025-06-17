import { resolveServiceURL } from "./resolve-service-url";
import { getAuthToken } from "~/services/auth";

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  session_count: number;
  document_count: number;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface MoveToProjectData {
  project_id?: string; // null means move to "no project"
}

// Project CRUD operations
export async function getProjects(includeArchived: boolean = false): Promise<Project[]> {
  const response = await fetch(
    resolveServiceURL(`projects?include_archived=${includeArchived}`),
    {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch projects");
  }

  return response.json();
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const response = await fetch(resolveServiceURL("projects"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create project");
  }

  return response.json();
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await fetch(resolveServiceURL(`projects/${projectId}`), {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch project");
  }

  return response.json();
}

export async function updateProject(
  projectId: string,
  data: UpdateProjectData
): Promise<Project> {
  const response = await fetch(resolveServiceURL(`projects/${projectId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update project");
  }

  return response.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(resolveServiceURL(`projects/${projectId}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete project");
  }
}

export async function archiveProject(projectId: string): Promise<void> {
  const response = await fetch(
    resolveServiceURL(`projects/${projectId}/archive`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to archive project");
  }
}

// Move content to projects
export async function moveSessionToProject(
  sessionId: string,
  projectId?: string
): Promise<void> {
  const response = await fetch(
    resolveServiceURL(`chat/sessions/${sessionId}/project`),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ project_id: projectId }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to move session to project");
  }
}

export async function moveDocumentToProject(
  documentId: string,
  projectId?: string
): Promise<void> {
  const response = await fetch(
    resolveServiceURL(`documents/${documentId}/project`),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ project_id: projectId }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to move document to project");
  }
}

export async function getDefaultProject(): Promise<Project> {
  const response = await fetch(resolveServiceURL("projects/default"), {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get default project");
  }

  return response.json();
}

// Predefined project colors and icons
export const PROJECT_COLORS = [
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6B7280", // Gray
];

export const PROJECT_ICONS = [
  { id: "folder", name: "Folder", emoji: "📁" },
  { id: "briefcase", name: "Briefcase", emoji: "💼" },
  { id: "rocket", name: "Rocket", emoji: "🚀" },
  { id: "lightbulb", name: "Lightbulb", emoji: "💡" },
  { id: "target", name: "Target", emoji: "🎯" },
  { id: "chart", name: "Chart", emoji: "📊" },
  { id: "book", name: "Book", emoji: "📚" },
  { id: "computer", name: "Computer", emoji: "💻" },
  { id: "microscope", name: "Research", emoji: "🔬" },
  { id: "tools", name: "Tools", emoji: "🛠️" },
  { id: "star", name: "Star", emoji: "⭐" },
  { id: "heart", name: "Heart", emoji: "❤️" },
];