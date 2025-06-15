#!/usr/bin/env python3
"""Simple test to verify deep research flow without authentication."""

import requests
import json
import time
import uuid

# API endpoint
CHAT_URL = "http://localhost:8000/api/chat/simple"

def test_research_flow():
    """Test the research flow without authentication."""
    
    thread_id = f"test-research-{uuid.uuid4().hex[:8]}"
    
    # Step 1: Send initial research request
    print("=== Testing Deep Research Flow ===\n")
    print("Step 1: Sending research request with auto_accepted_plan=False")
    print("-" * 80)
    
    payload = {
        "thread_id": thread_id,
        "messages": [{
            "role": "user",
            "content": "I need you to do deep research on quantum computing developments and their applications in cryptography. Please create a comprehensive research report with citations."
        }],
        "auto_accepted_plan": False,  # This should trigger plan review
        "enable_background_investigation": True,
        "max_plan_iterations": 1,
        "max_step_num": 3
    }
    
    print(f"Thread ID: {thread_id}")
    print(f"Payload: {json.dumps(payload, indent=2)}\n")
    
    response = requests.post(CHAT_URL, json=payload, stream=True)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return False
    
    print("Response:")
    plan_received = False
    interrupt_received = False
    
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    
                    if data.get("agent") == "planner":
                        plan_received = True
                        print(f"✅ PLAN RECEIVED from planner agent")
                        if "content" in data:
                            content = json.loads(data["content"])
                            if "title" in content:
                                print(f"   Plan title: {content['title']}")
                            if "steps" in content:
                                print(f"   Number of steps: {len(content['steps'])}")
                    
                    if "interrupt" in str(data).lower() or data.get("finish_reason") == "interrupt":
                        interrupt_received = True
                        print(f"✅ INTERRUPT DETECTED - User feedback required")
                        
                    # Show agent activity
                    if "agent" in data:
                        print(f"   Agent: {data['agent']}")
                        if "content" in data and data["content"]:
                            print(f"   Content preview: {data['content'][:200]}...")
                        
                except json.JSONDecodeError:
                    continue
    
    if not plan_received:
        print("\n❌ FAILED: No plan was received")
        return False
        
    print("\n" + "-" * 80)
    print("Step 2: Accepting the research plan")
    print("-" * 80)
    
    # Wait a bit
    time.sleep(1)
    
    # Step 2: Accept the plan
    accept_payload = {
        "thread_id": thread_id,
        "messages": [{
            "role": "user", 
            "content": "Great! Let's start the research."
        }],
        "interrupt_feedback": "accepted",  # Key part - this should trigger research
        "auto_accepted_plan": False
    }
    
    print(f"Sending acceptance with interrupt_feedback='accepted'")
    print(f"Payload: {json.dumps(accept_payload, indent=2)}\n")
    
    response = requests.post(CHAT_URL, json=accept_payload, stream=True)
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return False
    
    print("Response after acceptance:")
    research_started = False
    agents_seen = set()
    coordinator_response = False
    
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    
                    if "agent" in data:
                        agent = data["agent"]
                        agents_seen.add(agent)
                        
                        # Check for research agents
                        if agent in ["research_team", "researcher", "reporter"]:
                            research_started = True
                            print(f"✅ RESEARCH AGENT ACTIVE: {agent}")
                        elif agent == "coordinator" and "content" in data and data["content"]:
                            coordinator_response = True
                            print(f"⚠️  COORDINATOR RESPONSE: {data['content'][:100]}...")
                        else:
                            print(f"   Agent: {agent}")
                            
                except json.JSONDecodeError:
                    continue
    
    print("\n" + "-" * 80)
    print("=== TEST RESULTS ===")
    print(f"Agents seen: {agents_seen}")
    print(f"Research started: {research_started}")
    print(f"Got coordinator response: {coordinator_response}")
    
    if research_started:
        print("\n✅ SUCCESS: Deep research was triggered successfully!")
        print("The workflow correctly transitioned from planner → human_feedback → research_team")
    else:
        print("\n❌ FAILURE: Deep research was NOT triggered")
        if coordinator_response:
            print("Instead, got a regular chat response from coordinator")
            print("The workflow did not transition to research_team as expected")
    
    return research_started

if __name__ == "__main__":
    success = test_research_flow()
    exit(0 if success else 1)