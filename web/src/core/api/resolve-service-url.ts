// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { env } from "~/env";

export function resolveServiceURL(path: string) {
  let BASE_URL = env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
  
  // If we're in the browser, dynamically determine the API URL
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // If accessing from an EC2 instance or any non-localhost address,
    // use the same host but on port 8000
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      BASE_URL = `${currentProtocol}//${currentHost}:8000/api`;
      console.log(`[API] Using dynamic URL for EC2/remote access: ${BASE_URL}`);
    }
  }
  
  // Remove trailing slash if present to avoid double slashes
  if (BASE_URL.endsWith("/")) {
    BASE_URL = BASE_URL.slice(0, -1);
  }
  // Ensure path starts with /
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  const fullUrl = BASE_URL + path;
  console.log(`[resolveServiceURL] Resolved URL: ${fullUrl}`);
  return fullUrl;
}
