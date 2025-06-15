#!/usr/bin/env python3
"""Quick test to verify deep research flow is working."""

import requests
import json
import time
import uuid

CHAT_URL = "http://localhost:8000/api/chat/stream"

def test_research():
    thread_id = f"test-{uuid.uuid4().hex[:8]}"
    
    print("=== Deep Research Flow Test ===\n")
    
    # Send research request
    print("1. Sending research request...")
    response = requests.post(CHAT_URL, json={
        "thread_id": thread_id,
        "messages": [{"role": "user", "content": "Research quantum computing"}],
        "auto_accepted_plan": False,
        "enable_background_investigation": True,
        "max_plan_iterations": 1,
        "max_step_num": 3
    }, stream=True)
    
    plan_found = False
    interrupt_found = False
    
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    if data.get("agent") == "planner":
                        plan_found = True
                except:
                    pass
            elif "event: interrupt" in line_str:
                interrupt_found = True
                
    print(f"   Plan received: {'✅' if plan_found else '❌'}")
    print(f"   Interrupt received: {'✅' if interrupt_found else '❌'}")
    
    if not plan_found:
        return False
        
    # Accept the plan
    time.sleep(1)
    print("\n2. Accepting research plan...")
    
    response = requests.post(CHAT_URL, json={
        "thread_id": thread_id,
        "messages": [],
        "interrupt_feedback": "accepted",
        "auto_accepted_plan": False
    }, stream=True)
    
    agents_seen = set()
    research_active = False
    line_count = 0
    
    for line in response.iter_lines():
        if line and line_count < 100:  # Limit output
            line_count += 1
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    if "agent" in data:
                        agent = data["agent"]
                        agents_seen.add(agent)
                        if agent in ["research_team", "researcher"]:
                            research_active = True
                except:
                    pass
                    
    print(f"   Agents seen: {agents_seen}")
    print(f"   Research active: {'✅' if research_active else '❌'}")
    
    print(f"\n{'✅ SUCCESS' if research_active else '❌ FAILED'}: Deep research flow is {'working' if research_active else 'not working'}")
    return research_active

if __name__ == "__main__":
    test_research()