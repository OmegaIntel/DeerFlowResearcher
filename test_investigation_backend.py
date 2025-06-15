#!/usr/bin/env python3
"""Test Investigation toggle directly via API."""

import requests
import json
import time

print("=== Testing Investigation Toggle Backend ===\n")

# Test 1: Without Investigation toggle
print("1. Test WITHOUT Investigation toggle (should use simple chat)")
thread_id = "test-without-investigation"

response = requests.post("http://localhost:8000/api/chat/stream", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "Hello"}],
    "enable_background_investigation": False,  # Investigation OFF
    "auto_accepted_plan": False,
    "max_plan_iterations": 3,
    "max_step_num": 25
}, stream=True)

plan_found = False
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                if data.get("agent") == "planner":
                    plan_found = True
                    break
            except:
                pass

print(f"   Plan found: {'❌ No (as expected)' if not plan_found else '✅ Yes (unexpected)'}")

# Test 2: With Investigation toggle
print("\n2. Test WITH Investigation toggle (should trigger research)")
thread_id = "test-with-investigation"

response = requests.post("http://localhost:8000/api/chat/stream", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest AI trends?"}],
    "enable_background_investigation": True,  # Investigation ON
    "auto_accepted_plan": False,
    "max_plan_iterations": 3,
    "max_step_num": 25
}, stream=True)

plan_found = False
interrupt_found = False
events = []

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("event:"):
            event_type = line_str.replace("event: ", "").strip()
            if event_type not in events:
                events.append(event_type)
                
        elif line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                if data.get("agent") == "planner":
                    plan_found = True
                if data.get("finish_reason") == "interrupt":
                    interrupt_found = True
                    break
            except:
                pass

print(f"   Plan found: {'✅ Yes' if plan_found else '❌ No'}")
print(f"   Interrupt found: {'✅ Yes' if interrupt_found else '❌ No'}")
print(f"   Events: {events}")

# Summary
print("\n=== SUMMARY ===")
if plan_found or interrupt_found:
    print("✅ Backend correctly triggers research flow when enable_background_investigation=True")
else:
    print("❌ Backend is NOT triggering research flow with Investigation toggle")

print("\nThe issue is likely in the frontend not passing enable_background_investigation correctly")