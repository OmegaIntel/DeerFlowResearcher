"use client";

import { GithubOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "~/components/ui/button";
import { ThemeToggle } from "../../components/deer-flow/theme-toggle";
import { SettingsDialog } from "../settings/dialogs/settings-dialog";

const Main = dynamic(() => import("./main"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      Loading MCP Chat...
    </div>
  ),
});

export default function MCPChatPage() {

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex h-12 w-full items-center justify-end px-4 bg-white/80 dark:bg-stone-950/80 backdrop-blur-sm z-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="https://www.omegaintelligence.ai/" target="_blank">
              <GithubOutlined />
            </Link>
          </Button>
          <ThemeToggle />
          <Suspense>
            <SettingsDialog />
          </Suspense>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Main />
      </main>
    </div>
  );
}
