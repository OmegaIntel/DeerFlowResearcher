#\!/usr/bin/env python3
"""Test research flow with detailed output."""

import requests
import json
import time

CHAT_URL = "http://localhost:8000/api/chat/stream"

print("=== Detailed Research Flow Test ===\n")

thread_id = "test-detailed"

# Step 1: Send research request
print("1. Sending research request...")
response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "Research quantum computing advances"}],
    "auto_accepted_plan": False,
    "enable_background_investigation": True
}, stream=True)

events = []
plan_content = ""
is_collecting_plan = False
event_count = 0

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        event_count += 1
        
        if line_str.startswith("event:"):
            event_type = line_str.replace("event: ", "").strip()
            if event_type not in events:
                events.append(event_type)
                print(f"\n[NEW EVENT TYPE]: {event_type}")
                
        elif line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Track plan content
                if data.get("agent") == "planner":
                    if not is_collecting_plan:
                        is_collecting_plan = True
                        print("\n[PLAN STARTED]")
                    if "content" in data:
                        plan_content += data["content"]
                        
                # Check for finish reason
                if "finish_reason" in data:
                    print(f"\n[FINISH REASON]: {data['finish_reason']}")
                    if data["finish_reason"] == "interrupt":
                        print("[INTERRUPT DETECTED\!]")
                        print(f"Data: {json.dumps(data, indent=2)}")
                        break
                        
                # Check for options (interrupt options)
                if "options" in data:
                    print(f"\n[OPTIONS FOUND]: {data['options']}")
                    
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"Error: {e}")

print(f"\n\nTotal events processed: {event_count}")
print(f"Event types seen: {events}")

if plan_content:
    print("\n[PLAN CONTENT]:")
    try:
        plan_json = json.loads(plan_content)
        print(json.dumps(plan_json, indent=2))
    except:
        print(plan_content)

print("\n\nTest complete\!")
