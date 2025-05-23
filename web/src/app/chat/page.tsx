// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { GithubOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "~/components/ui/button";
import { Logo } from "../../components/deer-flow/logo";
import { ThemeToggle } from "../../components/deer-flow/theme-toggle";
import { SettingsDialog } from "../settings/dialogs/settings-dialog";
import { useAuth } from "~/hooks/use-auth";

const Main = dynamic(() => import("./main"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      Loading Omega...
    </div>
  ),
});

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex h-12 w-full items-center justify-end px-4 bg-white/80 dark:bg-stone-950/80 backdrop-blur-sm z-50 flex-shrink-0">
        {/* <Logo /> */}
        <div className="flex items-center gap-2">
          {/* {isAuthenticated() && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Go to Dashboard
              </Button>
            </Link>
          )} */}
          <Button variant="ghost" size="icon" asChild>
            <Link
              href="https://www.omegaintelligence.ai/"
              target="_blank"
            >
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