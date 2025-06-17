// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import Link from "next/link";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      className="opacity-70 transition-opacity duration-300 hover:opacity-100"
      href="/"
    >
      OI
    </Link>
  );
}

export function LogoIcon({ className }: { className?: string }) {
  return (
    <div className={`${className} bg-white text-black font-bold flex items-center justify-center rounded-lg w-full h-full`}>
      OI
    </div>
  );
}
