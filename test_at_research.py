#\!/usr/bin/env python3
"""Test @research functionality."""

import requests
import json
import time

# Use the tool endpoint like the UI does
TOOL_URL = "http://localhost:8000/api/chat/tool"

print("=== Test @research Tool ===\n")

thread_id = "test-at-research"

# Step 1: Send research request using tool endpoint
print("1. Sending research request via tool endpoint...")
response = requests.post(TOOL_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest AI trends?"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 25
}, stream=True)

events = []
interrupt_found = False
plan_found = False

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("event:"):
            event_type = line_str.replace("event: ", "").strip()
            if event_type not in events:
                events.append(event_type)
                print(f"[EVENT]: {event_type}")
                
        elif line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                if data.get("agent") == "planner":
                    plan_found = True
                    
                if data.get("finish_reason") == "interrupt":
                    interrupt_found = True
                    print("\n✅ INTERRUPT RECEIVED\!")
                    print(f"Options: {data.get('options', [])}")
                    break
                    
            except:
                pass

print(f"\nResults:")
print(f"  Plan found: {'✅' if plan_found else '❌'}")
print(f"  Interrupt found: {'✅' if interrupt_found else '❌'}")
print(f"  Events: {events}")

if interrupt_found:
    print("\n✅ SUCCESS: @research is triggering the deep research flow correctly\!")
else:
    print("\n❌ FAILED: @research is not triggering interrupts")
