"use client";

import dynamic from "next/dynamic";

import { AppSidebar } from "~/components/deer-flow/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

const ChatHistoryMain = dynamic(() => import("./main"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      Loading Chat History...
    </div>
  ),
});

export default function ChatHistoryPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ChatHistoryMain />
      </SidebarInset>
    </SidebarProvider>
  );
}