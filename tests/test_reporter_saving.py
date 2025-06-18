#!/usr/bin/env python3
"""Test if reporter messages are being saved properly"""

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
    """Test complete research flow with reporter message"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create unique thread ID
    thread_id = f"test_reporter_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"\n[{datetime.now()}] Starting research with thread_id: {thread_id}")
    
    # Start research
    data = {
        "messages": [{"role": "user", "content": "What are the latest trends in AI?"}],
        "thread_id": thread_id,
        "auto_accepted_plan": True  # Auto-accept to ensure reporter runs
    }
    
    print("✓ Sending research request...")
    messages_received = []
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            "POST",
            f"{BASE_URL}/api/chat/stream",
            json=data,
            headers=headers
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    try:
                        event_data = json.loads(line[6:])
                        agent = event_data.get("agent", "unknown")
                        content = event_data.get("content", "")
                        finish_reason = event_data.get("finish_reason")
                        
                        if content and finish_reason:
                            messages_received.append({
                                "agent": agent,
                                "content": content[:100] + "..." if len(content) > 100 else content,
                                "finish_reason": finish_reason
                            })
                            print(f"✓ Received {agent} message (finish_reason: {finish_reason})")
                            
                    except json.JSONDecodeError:
                        pass
    
    print(f"\n[{datetime.now()}] Research completed!")
    print(f"Total messages received: {len(messages_received)}")
    
    # Print agent breakdown
    agent_counts = {}
    for msg in messages_received:
        agent = msg["agent"]
        agent_counts[agent] = agent_counts.get(agent, 0) + 1
    
    print("\nAgent message counts:")
    for agent, count in agent_counts.items():
        print(f"  - {agent}: {count}")
    
    # Check if reporter message was received
    reporter_messages = [msg for msg in messages_received if msg["agent"] == "reporter"]
    if reporter_messages:
        print(f"\n✓ Reporter message received! Preview:")
        print(f"  {reporter_messages[0]['content']}")
    else:
        print("\n⚠️  No reporter message received")
    
    # Wait a moment for database writes
    await asyncio.sleep(2)
    
    # Check if messages were saved
    print(f"\n[{datetime.now()}] Checking saved messages...")
    sessions_response = requests.get(
        f"{BASE_URL}/api/chat/sessions?skip=0&limit=5",
        headers=headers
    )
    
    if sessions_response.status_code == 200:
        sessions = sessions_response.json()
        
        # Find our test session
        test_session = None
        for session in sessions:
            if session["thread_id"] == thread_id:
                test_session = session
                break
        
        if test_session:
            print(f"✓ Found test session: {test_session['id']}")
            
            # Get session details
            session_detail = requests.get(
                f"{BASE_URL}/api/chat/sessions/{test_session['id']}",
                headers=headers
            )
            
            if session_detail.status_code == 200:
                detail = session_detail.json()
                messages = detail.get("messages", [])
                print(f"✓ Session has {len(messages)} saved messages")
                
                # Check for reporter message
                reporter_saved = False
                for msg in messages:
                    if msg["role"] == "assistant" and "# " in msg["content"] and "## Key Points" in msg["content"]:
                        reporter_saved = True
                        print(f"✓ REPORTER MESSAGE SAVED! Preview:")
                        print(f"  {msg['content'][:200]}...")
                        break
                
                if not reporter_saved:
                    print("⚠️  Reporter message NOT found in saved messages")
                    print("\nAll saved messages:")
                    for i, msg in enumerate(messages):
                        print(f"  {i+1}. {msg['role']}: {msg['content'][:100]}...")
            else:
                print(f"Failed to get session details: {session_detail.status_code}")
        else:
            print(f"⚠️  Test session not found with thread_id: {thread_id}")
    else:
        print(f"Failed to get sessions: {sessions_response.status_code}")

if __name__ == "__main__":
    asyncio.run(test_research_flow())