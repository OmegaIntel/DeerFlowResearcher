#!/usr/bin/env python3
"""Test the full research flow with plan acceptance."""

import requests
import json
import time

print("=== Testing Full Research Flow ===\n")

thread_id = f"test-full-flow-{int(time.time())}"

# Step 1: Send research request
print("1. Sending research request...")
response = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What is Python?"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 2
}, stream=True)

# Track events
plan_received = False
interrupt_received = False
nodes_visited = []
current_agent = None

print("\n2. Waiting for plan and interrupt...")
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                agent = data.get("agent", "")
                
                # Track nodes
                if agent and agent != current_agent:
                    current_agent = agent
                    nodes_visited.append(agent)
                    print(f"   → {agent}")
                
                # Check for plan
                if agent == "planner" and data.get("content"):
                    plan_received = True
                    print("   ✓ Plan received")
                
                # Check for interrupt
                if data.get("finish_reason") == "interrupt":
                    interrupt_received = True
                    print("   ✓ Interrupt received")
                    print(f"   Options: {data.get('options', [])}")
                    break
                    
            except Exception as e:
                pass

response.close()

if not interrupt_received:
    print("   ❌ No interrupt received!")
    exit(1)

# Step 2: Accept the plan
print("\n3. Accepting the plan...")
response2 = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [],  # Empty messages
    "tool_id": "research",
    "tool_type": "agent",
    "interrupt_feedback": "accepted",
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 2
}, stream=True)

# Track the rest of the flow
reporter_count = 0
for line in response2.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                agent = data.get("agent", "")
                
                # Track nodes
                if agent and agent != current_agent:
                    current_agent = agent
                    nodes_visited.append(agent)
                    print(f"   → {agent}")
                    
                    if agent == "reporter":
                        reporter_count += 1
                        print(f"     [REPORTER #{reporter_count}]")
                        
            except Exception as e:
                pass

response2.close()

# Analyze results
print("\n4. Analysis:")
print(f"   - Total nodes visited: {len(nodes_visited)}")
print(f"   - Reporter invocations: {reporter_count}")
print(f"   - Complete flow: {' → '.join(nodes_visited)}")

if reporter_count > 1:
    print(f"\n   ⚠️  WARNING: Reporter was invoked {reporter_count} times!")
else:
    print("\n   ✅ SUCCESS: Reporter was invoked only once.")