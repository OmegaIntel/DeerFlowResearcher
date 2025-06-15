#!/usr/bin/env python3
"""Test to see plan content."""

import requests
import json

print("=== Testing Plan Content ===\n")

thread_id = "test-plan-content"

print("1. Sending research request...")
response = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest AI trends in 2024?"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 25
}, stream=True)

plan_content = None

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Look for planner content
                if data.get("agent") == "planner" and data.get("content"):
                    plan_content = data.get("content")
                    
            except:
                pass

if plan_content:
    print("\n2. Plan content:")
    print(plan_content)
    
    # Try to parse it as JSON
    try:
        # Find JSON in the content
        import re
        json_match = re.search(r'\{.*\}', plan_content, re.DOTALL)
        if json_match:
            plan_json = json.loads(json_match.group())
            print("\n3. Parsed plan:")
            print(f"   Title: {plan_json.get('title', 'N/A')}")
            print(f"   Has enough context: {plan_json.get('has_enough_context', 'N/A')}")
            print(f"   Number of steps: {len(plan_json.get('steps', []))}")
            
            if plan_json.get('steps'):
                print("\n4. Steps:")
                for i, step in enumerate(plan_json['steps'], 1):
                    print(f"   {i}. {step.get('title', 'N/A')} (type: {step.get('step_type', 'N/A')})")
                    
    except Exception as e:
        print(f"\n3. Could not parse plan as JSON: {e}")