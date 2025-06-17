"use client";

import { AppSidebar } from "~/components/deer-flow/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { ProjectManager } from "~/components/projects/project-manager";

export default function ProjectsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ProjectManager />
      </SidebarInset>
    </SidebarProvider>
  );
}