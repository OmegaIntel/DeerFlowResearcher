// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { usePathname } from "next/navigation";

import { ThemeProvider } from "~/components/theme-provider";

export function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Only force dark theme on landing page and auth pages
  const shouldForceDark = pathname === "/" || pathname?.startsWith("/auth");

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={"system"}
      enableSystem={true}
      forcedTheme={shouldForceDark ? "dark" : undefined}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
