"use client";

import { MessagesBlock } from "./components/messages-block";

export default function MCPMain() {
  return (
    <div className="flex h-full w-full justify-center px-4 py-4">
      <MessagesBlock className="w-full max-w-[768px]" />
    </div>
  );
}
