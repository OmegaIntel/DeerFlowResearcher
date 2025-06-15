#\!/usr/bin/env python3
"""Final test for research execution with proper interrupt handling."""

import requests
import json
import time

print("=== Testing Research Execution with Interrupt Handling ===\n")

thread_id = "test-research-final"

# Step 1: Initial request
print("1. Sending research request...")
response1 = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest AI trends in 2024?"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 3  # Limit steps for faster testing
}, stream=True)

plan_content = None
interrupt_received = False

print("\n2. Processing initial response...")
for line in response1.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Track plan content
                if data.get("agent") == "planner" and data.get("content"):
                    plan_content = data.get("content")
                    
                # Check for interrupt
                if data.get("finish_reason") == "interrupt":
                    interrupt_received = True
                    print("   ✓ Interrupt received - plan ready for review")
                    break
                    
            except:
                pass

response1.close()

if interrupt_received and plan_content:
    # Parse plan to verify has_enough_context is false
    try:
        import re
        json_match = re.search(r'\{.*\}', plan_content, re.DOTALL)
        if json_match:
            plan_json = json.loads(json_match.group())
            print(f"\n3. Plan details:")
            print(f"   - Has enough context: {plan_json.get('has_enough_context')}")
            print(f"   - Number of steps: {len(plan_json.get('steps', []))}")
            
            if plan_json.get('has_enough_context') == False:
                print("   ✓ Planner correctly set has_enough_context=false")
            else:
                print("   ✗ ERROR: Planner set has_enough_context=true")
    except:
        pass

    # Step 2: Accept the plan and continue
    print("\n4. Accepting plan and continuing research...")
    time.sleep(0.5)  # Short delay
    
    response2 = requests.post("http://localhost:8000/api/chat/tool", json={
        "thread_id": thread_id,
        "messages": [{"role": "user", "content": "What are the latest AI trends in 2024?"}],
        "tool_id": "research",
        "tool_type": "agent",
        "interrupt_feedback": "accepted",
        "auto_accepted_plan": False,
        "enable_background_investigation": True,
        "max_plan_iterations": 3,
        "max_step_num": 3
    }, stream=True)
    
    agents_seen = []
    events_seen = []
    tool_names = []
    research_executed = False
    final_report_received = False
    
    print("\n5. Monitoring research execution...")
    event_count = 0
    for line in response2.iter_lines():
        if line and event_count < 2000:  # Increased limit
            event_count += 1
            line_str = line.decode('utf-8')
            
            # Track events
            if line_str.startswith("event:"):
                event_type = line_str.replace("event: ", "").strip()
                if event_type not in events_seen:
                    events_seen.append(event_type)
                    if event_type in ["tool_calls", "tool_call_chunks", "tool_call_result"]:
                        print(f"   ✓ Tool event: {event_type}")
                        
            elif line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    
                    # Track agents
                    if agent := data.get("agent"):
                        if agent not in agents_seen:
                            agents_seen.append(agent)
                            print(f"   ✓ Agent active: {agent}")
                            if agent in ["researcher", "research_team"]:
                                research_executed = True
                    
                    # Track tool calls
                    if "tool_calls" in data or "name" in data:
                        tool_info = data.get("tool_calls", [{}])[0] if "tool_calls" in data else data
                        if tool_name := tool_info.get("name"):
                            if tool_name not in tool_names:
                                tool_names.append(tool_name)
                                print(f"   ✓ Tool called: {tool_name}")
                    
                    # Check for final report
                    if data.get("agent") == "reporter":
                        final_report_received = True
                        
                    # Check for completion
                    if data.get("finish_reason") in ["stop", "complete"]:
                        print("\n6. Research workflow completed")
                        break
                        
                except:
                    pass
    
    response2.close()
    
    # Final summary
    print(f"\n7. Execution Summary:")
    print(f"   - Agents involved: {', '.join(agents_seen) if agents_seen else 'None'}")
    print(f"   - Events seen: {', '.join(events_seen) if events_seen else 'None'}")
    print(f"   - Tools used: {', '.join(tool_names) if tool_names else 'None'}")
    print(f"   - Research executed: {'✅' if research_executed else '❌'}")
    print(f"   - Final report generated: {'✅' if final_report_received else '❌'}")
    
    if research_executed and len(tool_names) > 0:
        print("\n✅ SUCCESS: Deep research is now working with tools!")
    else:
        print("\n❌ FAIL: Research did not execute with tools")
        print("\nDebugging info:")
        print(f"   - Event count processed: {event_count}")
        
else:
    print("\n❌ ERROR: No interrupt received or no plan content")
