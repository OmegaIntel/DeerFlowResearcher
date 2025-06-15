#!/usr/bin/env python3
"""Test to trace report generation and find duplicates."""

import requests
import json
import time

print("=== Testing Report Generation ===\n")

thread_id = f"test-report-gen-{int(time.time())}"

# Step 1: Send research request with auto-accepted plan
print("1. Sending research request with auto-accepted plan...")
response = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What is Python?"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,  # Don't auto-accept to see the flow
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 2  # Limit steps to make test faster
}, stream=True)

# Track nodes
nodes_visited = []
reporter_count = 0
planner_count = 0
research_team_count = 0
current_agent = None

print("\n2. Tracking node execution...")
print("   Node sequence:")

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                agent = data.get("agent", "")
                
                # Track node changes
                if agent and agent != current_agent:
                    current_agent = agent
                    nodes_visited.append(agent)
                    print(f"   → {agent}")
                    
                    # Count specific nodes
                    if agent == "reporter":
                        reporter_count += 1
                        print(f"     [REPORTER #{reporter_count}]")
                    elif agent == "planner":
                        planner_count += 1
                        print(f"     [PLANNER #{planner_count}]")
                    elif agent == "research_team":
                        research_team_count += 1
                    
                    # Show first part of content for reporter
                    if agent == "reporter" and data.get("content"):
                        content_preview = data["content"][:100] + "..." if len(data["content"]) > 100 else data["content"]
                        print(f"     Content preview: {content_preview}")
                        
            except Exception as e:
                pass

response.close()

# Analyze results
print("\n3. Analysis:")
print(f"   - Total nodes visited: {len(nodes_visited)}")
print(f"   - Reporter invocations: {reporter_count}")
print(f"   - Planner invocations: {planner_count}")
print(f"   - Research team invocations: {research_team_count}")

if reporter_count > 1:
    print(f"\n   ⚠️  WARNING: Reporter was invoked {reporter_count} times!")
    print("   This is causing duplicate reports.")
else:
    print("\n   ✅ SUCCESS: Reporter was invoked only once.")

# Show the complete flow
print("\n4. Complete node flow:")
print("   " + " → ".join(nodes_visited))

# Look for patterns
print("\n5. Looking for loops...")
for i in range(len(nodes_visited) - 2):
    if nodes_visited[i] == nodes_visited[i+1] == nodes_visited[i+2]:
        print(f"   ⚠️  Found repeated node: {nodes_visited[i]} appears 3 times in a row at position {i}")

# Check for planner-reporter pattern
planner_reporter_pairs = 0
for i in range(len(nodes_visited) - 1):
    if nodes_visited[i] == "planner" and nodes_visited[i+1] == "reporter":
        planner_reporter_pairs += 1
        
if planner_reporter_pairs > 1:
    print(f"\n   ⚠️  Found {planner_reporter_pairs} planner→reporter transitions!")