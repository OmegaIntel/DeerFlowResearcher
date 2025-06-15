#!/usr/bin/env python3
"""Test to check planner output with background investigation."""

import requests
import json

print("=== Testing Planner with Background Investigation ===\n")

thread_id = "test-planner-check"

print("1. Sending research request with background investigation enabled...")
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
background_investigation_seen = False

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Look for background investigation
                if data.get("agent") == "background_investigator":
                    background_investigation_seen = True
                    print("   [AGENT]: background_investigator")
                
                # Look for planner content
                if data.get("agent") == "planner" and data.get("content"):
                    plan_content = data.get("content")
                    print("   [AGENT]: planner")
                    
                # Break on interrupt (plan review)
                if data.get("finish_reason") == "interrupt":
                    print("\n2. Interrupt received - plan ready for review")
                    break
                    
            except:
                pass

if plan_content:
    print("\n3. Plan content received")
    
    # Try to parse it as JSON
    try:
        # Find JSON in the content
        import re
        json_match = re.search(r'\{.*\}', plan_content, re.DOTALL)
        if json_match:
            plan_json = json.loads(json_match.group())
            print("\n4. Parsed plan:")
            print(f"   Title: {plan_json.get('title', 'N/A')}")
            print(f"   Has enough context: {plan_json.get('has_enough_context', 'N/A')}")
            print(f"   Number of steps: {len(plan_json.get('steps', []))}")
            
            if plan_json.get('has_enough_context') == False:
                print("\n✅ SUCCESS: Planner correctly set has_enough_context=false despite background investigation!")
                print("   The planner will now proceed to research_team after plan acceptance.")
            else:
                print("\n❌ FAIL: Planner set has_enough_context=true, will skip research!")
                
            if background_investigation_seen:
                print("\n5. Background investigation was performed as expected.")
            
    except Exception as e:
        print(f"\n3. Could not parse plan as JSON: {e}")
else:
    print("\n❌ No plan content received")