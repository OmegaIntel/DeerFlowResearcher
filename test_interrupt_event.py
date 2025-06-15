#!/usr/bin/env python3
"""Test if interrupt event is being sent correctly."""

import requests
import json
import time

print("=== Testing Interrupt Event ===\n")

thread_id = "test-interrupt-event"

# Step 1: Send research request
print("1. Sending research request...")
response = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest breakthroughs in quantum computing?"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 3
}, stream=True)

# Track events
plan_received = False
interrupt_received = False
interrupt_options = []

print("\n2. Processing response stream...")
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Check for plan
                if data.get("agent") == "planner" and data.get("content"):
                    plan_received = True
                    print(f"   ✓ Plan received from agent: {data.get('agent')}")
                
                # Check for interrupt event
                if data.get("finish_reason") == "interrupt":
                    interrupt_received = True
                    interrupt_options = data.get("options", [])
                    print(f"   ✓ Interrupt event received!")
                    print(f"     - Message ID: {data.get('id')}")
                    print(f"     - Content: {data.get('content')}")
                    print(f"     - Options: {interrupt_options}")
                    break
                    
            except Exception as e:
                pass

response.close()

# Check event type
print("\n3. Checking event structure...")
print(f"   - Event type field present: {'type' in line_str if 'line_str' in locals() else 'Unknown'}")
print(f"   - Last event line: {line_str[:100] if 'line_str' in locals() else 'None'}...")

# Analyze results
print("\n4. Analysis:")
print(f"   - Plan received: {'✅ Yes' if plan_received else '❌ No'}")
print(f"   - Interrupt received: {'✅ Yes' if interrupt_received else '❌ No'}")
print(f"   - Options found: {len(interrupt_options)}")

if interrupt_options:
    print("\n   Available options:")
    for opt in interrupt_options:
        print(f"     - Text: '{opt.get('text')}', Value: '{opt.get('value')}'")
    
    # Check for "Start research" option
    has_start_research = any(opt.get("value") == "accepted" for opt in interrupt_options)
    print(f"\n   - Has 'Start research' option: {'✅ Yes' if has_start_research else '❌ No'}")
else:
    print("\n   ❌ ERROR: No options found in interrupt event!")

# Additional check: Raw stream test
print("\n5. Testing raw stream to check event format...")
response2 = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": "test-raw-stream",
    "messages": [{"role": "user", "content": "Test"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 1,
    "max_step_num": 1
}, stream=True)

print("\n   First few events:")
event_count = 0
for line in response2.iter_lines():
    if line and event_count < 5:
        line_str = line.decode('utf-8')
        print(f"   {event_count + 1}. {line_str[:80]}...")
        event_count += 1
        
        # Check for event structure
        if line_str.startswith("event:"):
            print("      ^ Found SSE event header")

response2.close()