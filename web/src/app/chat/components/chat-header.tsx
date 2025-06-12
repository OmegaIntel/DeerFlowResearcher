// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { GithubOutlined } from "@ant-design/icons";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";

import { ThemeToggle } from "../../../components/deer-flow/theme-toggle";
import { Tooltip } from "../../../components/deer-flow/tooltip";
import { SettingsDialog } from "../../settings/dialogs/settings-dialog";

export function ChatHeader() {
  return (
    <header className="flex h-12 w-full items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-lg font-semibold">Chat</h1>
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
    </header>
  );
}