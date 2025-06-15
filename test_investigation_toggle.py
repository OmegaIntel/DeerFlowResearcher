#!/usr/bin/env python3
"""Test Investigation toggle functionality."""

import requests
import json
import time

# Use the chat/stream endpoint since Investigation toggle should trigger research mode
STREAM_URL = "http://localhost:8000/api/chat/stream"

print("=== Test Investigation Toggle ===\n")

thread_id = "test-investigation-toggle"

# Step 1: Send research request with Investigation enabled
print("1. Sending request with Investigation toggle ON...")
response = requests.post(STREAM_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest AI trends in 2024?"}],
    "enable_background_investigation": True,  # Investigation toggle ON
    "auto_accepted_plan": False,
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
                    print("\n✅ PLAN DETECTED! Research flow is triggered")
                    
                if data.get("finish_reason") == "interrupt":
                    interrupt_found = True
                    print("\n✅ INTERRUPT RECEIVED!")
                    print(f"Options: {data.get('options', [])}")
                    break
                    
            except:
                pass

print(f"\nResults:")
print(f"  Plan found: {'✅' if plan_found else '❌'}")
print(f"  Interrupt found: {'✅' if interrupt_found else '❌'}")
print(f"  Events: {events}")

if plan_found or interrupt_found:
    print("\n✅ SUCCESS: Investigation toggle is triggering the deep research flow correctly!")
else:
    print("\n❌ FAILED: Investigation toggle is not triggering research flow")