#!/usr/bin/env python3
"""Test full research flow with plan acceptance."""

import requests
import json
import time

print("=== Testing Full Research Flow ===\n")

thread_id = "test-full-research-flow"

print("1. Sending research request with background investigation enabled...")
response1 = requests.post("http://localhost:8000/api/chat/tool", json={
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
interrupt_found = False

for line in response1.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Check for plan
                if data.get("agent") == "planner" and data.get("content"):
                    plan_content = data.get("content")
                    
                # Check for interrupt
                if data.get("finish_reason") == "interrupt":
                    interrupt_found = True
                    print("2. Interrupt received - plan ready for review")
                    break
                    
            except:
                pass

if plan_content and interrupt_found:
    # Parse the plan
    try:
        import re
        json_match = re.search(r'\{.*\}', plan_content, re.DOTALL)
        if json_match:
            plan_json = json.loads(json_match.group())
            print(f"\n3. Plan parsed:")
            print(f"   - Has enough context: {plan_json.get('has_enough_context')}")
            print(f"   - Number of steps: {len(plan_json.get('steps', []))}")
            
            # Accept the plan
            print("\n4. Accepting the plan and continuing...")
            time.sleep(1)
            
            response2 = requests.post("http://localhost:8000/api/chat/tool", json={
                "thread_id": thread_id,
                "messages": [{"role": "user", "content": "What are the latest AI trends in 2024?"}],
                "tool_id": "research",
                "tool_type": "agent",
                "interrupt_feedback": "accepted",
                "auto_accepted_plan": False,
                "enable_background_investigation": True,
                "max_plan_iterations": 3,
                "max_step_num": 25
            }, stream=True)
            
            agents_seen = []
            tool_calls_seen = []
            research_executed = False
            
            print("\n5. Monitoring execution after plan acceptance:")
            
            event_count = 0
            for line in response2.iter_lines():
                if line and event_count < 1000:  # Limit to prevent infinite loop
                    event_count += 1
                    line_str = line.decode('utf-8')
                    
                    if line_str.startswith("event:"):
                        event_type = line_str.replace("event: ", "").strip()
                        
                        # Look for tool_calls events
                        if event_type == "tool_calls":
                            print(f"   [TOOL EVENT DETECTED]")
                            
                    elif line_str.startswith("data: "):
                        try:
                            data = json.loads(line_str[6:])
                            
                            # Track agents
                            if agent := data.get("agent"):
                                if agent not in agents_seen:
                                    agents_seen.append(agent)
                                    print(f"   [AGENT]: {agent}")
                                    if agent in ["researcher", "research_team"]:
                                        research_executed = True
                            
                            # Track tool calls
                            if data.get("name") and "event" in str(data.get("event", "")):
                                tool_name = data.get("name")
                                if tool_name not in tool_calls_seen:
                                    tool_calls_seen.append(tool_name)
                                    print(f"   [TOOL CALL]: {tool_name}")
                                    
                            # Stop on completion
                            if data.get("finish_reason") == "complete":
                                print("\n6. Research completed")
                                break
                                
                        except:
                            pass
            
            print(f"\n7. Summary:")
            print(f"   - Agents seen: {agents_seen}")
            print(f"   - Tool calls seen: {tool_calls_seen}")
            print(f"   - Research executed: {'✅' if research_executed else '❌'}")
            
            if research_executed and len(tool_calls_seen) > 0:
                print("\n✅ SUCCESS: Research is now executing with tools!")
            else:
                print("\n❌ FAIL: Research did not execute properly")
                
    except Exception as e:
        print(f"\nError parsing plan: {e}")
else:
    print("\n❌ No plan or interrupt received")