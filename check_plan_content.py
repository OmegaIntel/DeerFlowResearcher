#!/usr/bin/env python3
"""Check the plan content to see why it's not triggering research."""

import requests
import json
import uuid

CHAT_URL = "http://localhost:8000/api/chat/stream"

thread_id = f"check-{uuid.uuid4().hex[:8]}"

print("Checking plan content...")
print(f"Thread ID: {thread_id}\n")

# Send research request
response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "Research the latest trends in AI and machine learning"}],
    "auto_accepted_plan": False,
    "enable_background_investigation": True
}, stream=True)

plan_content = ""
collecting_plan = False

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                if "agent" in data and data["agent"] == "planner":
                    if "content" in data:
                        plan_content += data["content"]
                        collecting_plan = True
                elif collecting_plan and "agent" in data and data["agent"] != "planner":
                    break  # Stop when we see a different agent
            except:
                pass

print("Plan content collected. Parsing...")
try:
    plan_json = json.loads(plan_content)
    print(json.dumps(plan_json, indent=2))
    
    print(f"\nhas_enough_context: {plan_json.get('has_enough_context', 'NOT FOUND')}")
    
    if plan_json.get('has_enough_context', False):
        print("\n⚠️  This is why research is not triggered!")
        print("The planner thinks it has enough context and goes directly to reporter.")
except json.JSONDecodeError as e:
    print(f"Failed to parse plan JSON: {e}")
    print(f"Raw content: {plan_content[:500]}...")