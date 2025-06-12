// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import dynamic from "next/dynamic";

import { AppSidebar } from "~/components/deer-flow/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

const Main = dynamic(() => import("./main"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      Loading Omega...
    </div>
  ),
});

export default function HomePage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Main />
      </SidebarInset>
    </SidebarProvider>
  );
}
