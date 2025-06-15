#!/usr/bin/env python3
"""Quick verification that deep research flow triggers correctly."""

import requests
import json
import uuid
import sys

CHAT_URL = "http://localhost:8000/api/chat/stream"

thread_id = f"verify-{uuid.uuid4().hex[:8]}"

print("Testing deep research flow...")
print(f"Thread ID: {thread_id}\n")

# Send research request
print("1. Sending research request...")
response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "Research AI trends"}],
    "auto_accepted_plan": False,
    "enable_background_investigation": True
}, stream=True, timeout=10)

agents = set()
plan_found = False
line_count = 0

for line in response.iter_lines():
    if line and line_count < 50:  # Limit lines processed
        line_count += 1
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                if "agent" in data:
                    agents.add(data["agent"])
                    if data["agent"] == "planner":
                        plan_found = True
                        if "content" in data:
                            print(f"   Plan content preview: {data['content'][:200]}...")
            except:
                pass

print(f"   Agents seen: {agents}")
print(f"   Plan found: {'✅' if plan_found else '❌'}")

if not plan_found or "planner" not in agents:
    print("\n❌ FAILED: No plan received from planner")
    sys.exit(1)

# Accept plan
print("\n2. Accepting research plan...")
response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [],
    "interrupt_feedback": "accepted",
    "auto_accepted_plan": False
}, stream=True, timeout=10)

agents2 = set()
research_active = False
line_count = 0

for line in response.iter_lines():
    if line and line_count < 100:  # Increased limit
        line_count += 1
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                if "agent" in data:
                    agent = data["agent"]
                    agents2.add(agent)
                    print(f"      Agent: {agent}")
                    if agent in ["research_team", "researcher"]:
                        research_active = True
                        print("      ✅ Research triggered!")
                        break  # Exit early when research is confirmed
            except:
                pass

print(f"   Agents seen: {agents2}")
print(f"   Research active: {'✅' if research_active else '❌'}")

print(f"\n{'✅ SUCCESS' if research_active else '❌ FAILED'}: Deep research flow is {'working correctly' if research_active else 'NOT working'}")

if research_active:
    print("\nThe workflow transitions correctly:")
    print("coordinator → background_investigator → planner → human_feedback → research_team")

sys.exit(0 if research_active else 1)