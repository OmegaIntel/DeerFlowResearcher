"use client";

import dynamic from "next/dynamic";

import { AppSidebar } from "~/components/deer-flow/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

const DocumentsMain = dynamic(() => import("./main"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      Loading Documents...
    </div>
  ),
});

export default function DocumentsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DocumentsMain />
      </SidebarInset>
    </SidebarProvider>
  );
}