// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import Link from "next/link";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      className="opacity-70 transition-opacity duration-300 hover:opacity-100"
      href="/"
    >
      🦌 Omega Intelligence
    </Link>
  );
}

export function LogoIcon({ className }: { className?: string }) {
  return (
    <span className={className}>
      🦌
    </span>
  );
}
