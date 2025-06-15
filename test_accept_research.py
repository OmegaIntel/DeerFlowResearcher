#\!/usr/bin/env python3
"""Test accepting a research plan."""

import requests
import json
import time

CHAT_URL = "http://localhost:8000/api/chat/stream"

print("=== Test Research Plan Acceptance ===\n")

thread_id = "test-accept"

# Step 1: Send research request
print("1. Sending research request...")
response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "Research the latest AI trends"}],
    "auto_accepted_plan": False,
    "enable_background_investigation": True
}, stream=True)

interrupt_found = False
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                if data.get("finish_reason") == "interrupt":
                    interrupt_found = True
                    print("   ✅ Interrupt received with options")
                    break
            except:
                pass

if not interrupt_found:
    print("   ❌ No interrupt found")
    exit(1)

# Step 2: Accept the plan
time.sleep(1)
print("\n2. Accepting research plan...")

response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [],
    "interrupt_feedback": "accepted",
    "auto_accepted_plan": False
}, stream=True)

agents = set()
research_started = False

for line in response.iter_lines(decode_unicode=True):
    if line and line.startswith("data: "):
        try:
            data = json.loads(line[6:])
            if "agent" in data:
                agent = data["agent"]
                if agent not in agents:
                    agents.add(agent)
                    print(f"   Agent: {agent}")
                if agent in ["research_team", "researcher"]:
                    research_started = True
        except:
            pass

print(f"\n✅ Research started: {research_started}")
print(f"Agents involved: {agents}")
