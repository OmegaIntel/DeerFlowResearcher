#!/usr/bin/env python3
"""Simple test to trace the flow through the graph."""

import requests
import json
import uuid

CHAT_URL = "http://localhost:8000/api/chat/stream"

thread_id = f"flow-{uuid.uuid4().hex[:8]}"

print("Testing graph flow...")
print(f"Thread ID: {thread_id}\n")

# Send a simple research request
response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "Research AI trends in 2024"}],  # Research question
    "auto_accepted_plan": True,  # Auto accept to avoid interrupt
    "enable_background_investigation": True  # Enable background investigation
}, stream=True)

print("Agents in order of appearance:")
agents_order = []

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                if "agent" in data:
                    agent = data["agent"]
                    if not agents_order or agents_order[-1] != agent:
                        agents_order.append(agent)
                        print(f"  → {agent}")
            except:
                pass

print(f"\nFlow: {' → '.join(agents_order)}")