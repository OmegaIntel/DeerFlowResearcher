#!/usr/bin/env python3
"""Debug streaming to see what events are being sent"""

import asyncio
import json
import requests
from datetime import datetime
import httpx

# Test credentials
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."
BASE_URL = "http://localhost:8000"

def login():
    """Login and get token"""
    print(f"[{datetime.now()}] Logging in...")
    response = requests.post(
        f"{BASE_URL}/api/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        exit(1)
    
    token = response.json()["access_token"]
    print("✓ Login successful")
    return token

async def test_research_flow():
    """Test complete research flow with detailed event logging"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create unique thread ID
    thread_id = f"test_stream_debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"\n[{datetime.now()}] Starting research with thread_id: {thread_id}")
    
    # Step 1: Start research
    data = {
        "messages": [{"role": "user", "content": "What is machine learning?"}],
        "thread_id": thread_id,
        "auto_accepted_plan": False
    }
    
    print("✓ Step 1: Sending research request...")
    all_events = []
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            "POST",
            f"{BASE_URL}/api/chat/stream",
            json=data,
            headers=headers
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("event: "):
                    event_type = line[7:]
                    all_events.append({"type": event_type, "data": None})
                elif line.startswith("data: "):
                    try:
                        event_data = json.loads(line[6:])
                        if all_events and all_events[-1]["data"] is None:
                            all_events[-1]["data"] = event_data
                        
                        # Log specific events
                        agent = event_data.get("agent", "unknown")
                        finish_reason = event_data.get("finish_reason")
                        content_len = len(event_data.get("content", ""))
                        
                        print(f"  Event: {event_type if 'event_type' in locals() else 'message'} | Agent: {agent} | Content: {content_len} chars | Finish: {finish_reason}")
                        
                        if finish_reason == "interrupt":
                            print("✓ Received interrupt, stopping Step 1")
                            break
                            
                    except json.JSONDecodeError:
                        pass
    
    # Step 2: Accept the plan and continue
    print(f"\n✓ Step 2: Accepting plan and continuing research...")
    data = {
        "messages": [],
        "thread_id": thread_id,
        "interrupt_feedback": "accepted"
    }
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            "POST",
            f"{BASE_URL}/api/chat/stream",
            json=data,
            headers=headers
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("event: "):
                    event_type = line[7:]
                    all_events.append({"type": event_type, "data": None})
                elif line.startswith("data: "):
                    try:
                        event_data = json.loads(line[6:])
                        if all_events and all_events[-1]["data"] is None:
                            all_events[-1]["data"] = event_data
                        
                        # Log specific events
                        agent = event_data.get("agent", "unknown")
                        finish_reason = event_data.get("finish_reason")
                        content_len = len(event_data.get("content", ""))
                        
                        print(f"  Event: {event_type if 'event_type' in locals() else 'message'} | Agent: {agent} | Content: {content_len} chars | Finish: {finish_reason}")
                        
                        # Special logging for reporter
                        if agent == "reporter" or (content_len > 500 and "# " in event_data.get("content", "")):
                            print(f"  >>> POTENTIAL REPORTER MESSAGE! Agent: {agent}, Content preview: {event_data.get('content', '')[:100]}...")
                            
                    except json.JSONDecodeError:
                        pass
    
    print(f"\n[{datetime.now()}] Research completed!")
    print(f"Total events received: {len(all_events)}")
    
    # Analyze events by agent
    agent_events = {}
    for event in all_events:
        if event["data"]:
            agent = event["data"].get("agent", "unknown")
            agent_events[agent] = agent_events.get(agent, 0) + 1
    
    print("\nEvents by agent:")
    for agent, count in agent_events.items():
        print(f"  - {agent}: {count} events")
    
    # Look for reporter events specifically
    reporter_events = [e for e in all_events if e["data"] and e["data"].get("agent") == "reporter"]
    print(f"\nReporter events found: {len(reporter_events)}")
    
    # Check if any large content that might be reporter
    large_content_events = [e for e in all_events if e["data"] and len(e["data"].get("content", "")) > 500]
    print(f"Large content events (>500 chars): {len(large_content_events)}")
    
    for i, event in enumerate(large_content_events):
        data = event["data"]
        print(f"  {i+1}. Agent: {data.get('agent')} | Size: {len(data.get('content', ''))} | Preview: {data.get('content', '')[:80]}...")

if __name__ == "__main__":
    asyncio.run(test_research_flow())