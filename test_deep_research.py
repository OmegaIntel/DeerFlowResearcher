#!/usr/bin/env python3
"""Test script to verify deep research flow works correctly."""

import requests
import json
import time

# Test user credentials
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."

# API endpoints
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
CHAT_URL = f"{BASE_URL}/api/chat"

def login():
    """Login and get auth token."""
    print("Logging in...")
    response = requests.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD})
    if response.status_code == 200:
        data = response.json()
        print("Login successful")
        return data["token"]
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None

def send_research_request(token, thread_id="test-research-flow"):
    """Send a research request to trigger the deep research flow."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Request that should trigger deep research
    payload = {
        "thread_id": thread_id,
        "messages": [{
            "role": "user",
            "content": "Research the latest developments in quantum computing and their potential applications in cryptography"
        }],
        "auto_accepted_plan": False,  # This should trigger the plan review
        "enable_background_investigation": True,
        "max_plan_iterations": 1,
        "max_step_num": 3
    }
    
    print("\nSending research request...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        CHAT_URL,
        headers=headers,
        json=payload,
        stream=True
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None
        
    print("\nStreaming response:")
    print("-" * 80)
    
    plan_received = False
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith("data: "):
                try:
                    data = json.loads(line_str[6:])
                    
                    # Check if this is a plan
                    if data.get("agent") == "planner":
                        plan_received = True
                        print(f"\n✅ PLAN RECEIVED from agent: {data.get('agent')}")
                        print(f"Content preview: {data.get('content', '')[:200]}...")
                        
                    # Check for interrupts
                    if "interrupt" in data:
                        print(f"\n🔄 INTERRUPT DETECTED: {data}")
                        return thread_id, True
                        
                    # Print agent messages
                    if "agent" in data:
                        print(f"\nAgent: {data['agent']}")
                        if "content" in data and data["content"]:
                            print(f"Content: {data['content'][:200]}...")
                            
                except json.JSONDecodeError:
                    continue
    
    print("\n" + "-" * 80)
    return thread_id, plan_received

def accept_research_plan(token, thread_id):
    """Accept the research plan to trigger actual research."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Send acceptance with interrupt_feedback
    payload = {
        "thread_id": thread_id,
        "messages": [{
            "role": "user",
            "content": "Let's start the research!"
        }],
        "interrupt_feedback": "accepted",  # This should trigger the research
        "auto_accepted_plan": False,
        "enable_background_investigation": True
    }
    
    print("\nAccepting research plan...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        CHAT_URL,
        headers=headers,
        json=payload,
        stream=True
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return False
        
    print("\nStreaming response after acceptance:")
    print("-" * 80)
    
    research_started = False
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
                        print(f"\nAgent: {agent}")
                        
                        # Check if research team is active
                        if agent in ["research_team", "researcher", "reporter"]:
                            research_started = True
                            print(f"✅ RESEARCH STARTED - {agent} is active!")
                            
                        if "content" in data and data["content"]:
                            print(f"Content: {data['content'][:200]}...")
                            
                except json.JSONDecodeError:
                    continue
    
    print("\n" + "-" * 80)
    print(f"\nAgents seen: {agents_seen}")
    return research_started

def main():
    """Run the test."""
    print("=== Testing Deep Research Flow ===\n")
    
    # Step 1: Login
    token = login()
    if not token:
        print("Failed to login")
        return
    
    # Step 2: Send research request
    thread_id, plan_received = send_research_request(token)
    if not plan_received:
        print("\n❌ TEST FAILED: No plan received")
        return
    
    print(f"\n✅ Plan received for thread: {thread_id}")
    
    # Wait a moment
    print("\nWaiting 2 seconds before accepting plan...")
    time.sleep(2)
    
    # Step 3: Accept the plan
    research_started = accept_research_plan(token, thread_id)
    
    # Step 4: Check results
    print("\n=== TEST RESULTS ===")
    if research_started:
        print("✅ SUCCESS: Research was triggered after accepting the plan!")
        print("The deep research flow is working correctly.")
    else:
        print("❌ FAILURE: Research was NOT triggered after accepting the plan.")
        print("The system returned a chat response instead of starting research.")

if __name__ == "__main__":
    main()