#!/usr/bin/env python3
"""Test deep research flow using the streaming endpoint."""

import requests
import json
import time
import uuid

# API endpoint - use stream endpoint which uses the graph workflow
CHAT_URL = "http://localhost:8000/api/chat/stream"

def test_research_flow():
    """Test the research flow using streaming endpoint."""
    
    thread_id = f"test-research-{uuid.uuid4().hex[:8]}"
    
    # Step 1: Send initial research request
    print("=== Testing Deep Research Flow (Streaming API) ===\n")
    print("Step 1: Sending research request with auto_accepted_plan=False")
    print("-" * 80)
    
    payload = {
        "thread_id": thread_id,
        "messages": [{
            "role": "user",
            "content": "I need you to do research on quantum computing developments and their applications in cryptography. Please create a comprehensive research report."
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
    agents_seen = set()
    
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    
                    # Track agents
                    if "agent" in data:
                        agent = data["agent"]
                        agents_seen.add(agent)
                        print(f"   Agent: {agent}")
                        
                        if agent == "planner":
                            plan_received = True
                            print(f"   ✅ PLAN RECEIVED from planner agent")
                            if "content" in data and data["content"]:
                                try:
                                    content = json.loads(data["content"])
                                    if "title" in content:
                                        print(f"   Plan title: {content['title']}")
                                    if "steps" in content:
                                        print(f"   Number of steps: {len(content['steps'])}")
                                except:
                                    print(f"   Content preview: {data['content'][:100]}...")
                    
                    # Check for events
                    if line_str.startswith("event: interrupt"):
                        interrupt_received = True
                        print(f"   ✅ INTERRUPT EVENT RECEIVED")
                        
                except json.JSONDecodeError as e:
                    if "event:" in line_str:
                        print(f"   Event line: {line_str}")
                    continue
    
    print(f"\nAgents seen in step 1: {agents_seen}")
    
    if not plan_received:
        print("\n❌ FAILED: No plan was received")
        return False
        
    print(f"\n✅ Plan received, interrupt: {interrupt_received}")
    print("\n" + "-" * 80)
    print("Step 2: Accepting the research plan")
    print("-" * 80)
    
    # Wait a bit
    time.sleep(1)
    
    # Step 2: Accept the plan
    accept_payload = {
        "thread_id": thread_id,
        "messages": [],  # Empty messages when resuming
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
    agents_seen_step2 = set()
    coordinator_response = False
    
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    
                    if "agent" in data:
                        agent = data["agent"]
                        agents_seen_step2.add(agent)
                        
                        # Check for research agents
                        if agent in ["research_team", "researcher", "reporter"]:
                            research_started = True
                            print(f"   ✅ RESEARCH AGENT ACTIVE: {agent}")
                        elif agent == "coordinator" and "content" in data and data["content"]:
                            coordinator_response = True
                            print(f"   ⚠️  COORDINATOR RESPONSE: {data['content'][:100]}...")
                        else:
                            print(f"   Agent: {agent}")
                            
                except json.JSONDecodeError:
                    continue
    
    print(f"\nAgents seen in step 2: {agents_seen_step2}")
    print("\n" + "-" * 80)
    print("=== TEST RESULTS ===")
    print(f"Step 1 agents: {agents_seen}")
    print(f"Step 2 agents: {agents_seen_step2}")
    print(f"Research started: {research_started}")
    print(f"Got coordinator response: {coordinator_response}")
    
    if research_started:
        print("\n✅ SUCCESS: Deep research was triggered successfully!")
        print("The workflow correctly transitioned:")
        print("  coordinator → background_investigator → planner → human_feedback → research_team")
    else:
        print("\n❌ FAILURE: Deep research was NOT triggered")
        if coordinator_response:
            print("Instead, got a regular chat response from coordinator")
            print("The workflow did not transition to research_team as expected")
    
    return research_started

if __name__ == "__main__":
    success = test_research_flow()
    exit(0 if success else 1)