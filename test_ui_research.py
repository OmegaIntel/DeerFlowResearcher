#\!/usr/bin/env python3
"""Test research flow through the UI."""

import requests
import json
import time

CHAT_URL = "http://localhost:8000/api/chat/stream"

print("=== UI Research Flow Test ===\n")

thread_id = "ui-research-test"

# Step 1: Send research request
print("1. Sending research request...")
response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "Research the latest AI trends"}],
    "auto_accepted_plan": False,
    "enable_background_investigation": True
}, stream=True)

events = []
plan_found = False
interrupt_found = False

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("event:"):
            event_type = line_str.replace("event: ", "").strip()
            events.append(event_type)
        elif line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                if data.get("agent") == "planner":
                    plan_found = True
                    print(f"   ✅ Plan received from planner")
                if data.get("finish_reason") == "interrupt":
                    interrupt_found = True
                    print(f"   ✅ Interrupt received")
                    print(f"   Options: {data.get('options', [])}")
            except:
                pass

print(f"\nUnique events: {set(events)}")
print(f"Plan found: {'✅' if plan_found else '❌'}")
print(f"Interrupt found: {'✅' if interrupt_found else '❌'}")

print("\nResearch flow test complete\!")
