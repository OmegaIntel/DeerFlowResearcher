// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { useMemo, useEffect, useState } from "react";

import { env } from "~/env";

import { extractReplayIdFromSearchParams } from "./get-replay-id";

export function useReplay() {
  const [replayId, setReplayId] = useState<string | null>(null);
  
  useEffect(() => {
    // Only access search params on client side
    const searchParams = new URLSearchParams(window.location.search);
    const id = extractReplayIdFromSearchParams(searchParams.toString());
    setReplayId(id);
  }, []);
  
  return {
    isReplay: replayId != null || env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY,
    replayId,
  };
}