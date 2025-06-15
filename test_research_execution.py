#!/usr/bin/env python3
"""Test research execution flow."""

import requests
import json
import time

print("=== Testing Research Execution Flow ===\n")

# Test with @research
thread_id = "test-research-execution"

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

events = []
agents_seen = []
plan_found = False
interrupt_found = False
tool_calls_found = False

print("\n2. Streaming events:")
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("event:"):
            event_type = line_str.replace("event: ", "").strip()
            if event_type not in events:
                events.append(event_type)
                print(f"   [EVENT]: {event_type}")
                
        elif line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Track agents
                if agent := data.get("agent"):
                    if agent not in agents_seen:
                        agents_seen.append(agent)
                        print(f"   [AGENT]: {agent}")
                
                # Check for plan
                if data.get("agent") == "planner":
                    plan_found = True
                    
                # Check for interrupt
                if data.get("finish_reason") == "interrupt":
                    interrupt_found = True
                    print(f"\n3. Interrupt received with options: {data.get('options', [])}")
                    print("\n4. Accepting the plan...")
                    break
                    
                # Check for tool calls
                if "tool_calls" in data:
                    tool_calls_found = True
                    
            except:
                pass

# If we got an interrupt, continue with accepted plan
if interrupt_found:
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
    
    print("\n5. Continuing after accepting plan:")
    for line in response2.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("event:"):
                event_type = line_str.replace("event: ", "").strip()
                if event_type not in events:
                    events.append(event_type)
                    print(f"   [EVENT]: {event_type}")
                    
            elif line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    
                    # Track agents
                    if agent := data.get("agent"):
                        if agent not in agents_seen:
                            agents_seen.append(agent)
                            print(f"   [AGENT]: {agent}")
                    
                    # Check for tool calls
                    if event_type == "tool_calls":
                        tool_calls_found = True
                        if tool_name := data.get("name"):
                            print(f"   [TOOL CALL]: {tool_name}")
                            
                except:
                    pass

print(f"\n6. Summary:")
print(f"   Events: {events}")
print(f"   Agents seen: {agents_seen}")
print(f"   Plan found: {'✅' if plan_found else '❌'}")
print(f"   Tool calls found: {'✅' if tool_calls_found else '❌'}")

if 'researcher' in agents_seen or 'research_team' in agents_seen:
    print("\n✅ Research execution is working!")
else:
    print("\n❌ Research execution NOT working - no researcher agent seen")