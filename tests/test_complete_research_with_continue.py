#!/usr/bin/env python3
"""Test complete research flow with interrupt handling"""

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
    thread_id = f"test_reporter_complete_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"\n[{datetime.now()}] Starting research with thread_id: {thread_id}")
    
    # Step 1: Start research
    data = {
        "messages": [{"role": "user", "content": "What are the top 3 AI trends in 2024?"}],
        "thread_id": thread_id,
        "auto_accepted_plan": False  # We'll manually accept
    }
    
    print("✓ Step 1: Sending research request...")
    messages_received = []
    interrupt_received = False
    
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
                        
                        if finish_reason == "interrupt":
                            interrupt_received = True
                            print("✓ Received interrupt for plan review")
                            break
                            
                        if content and finish_reason:
                            messages_received.append({
                                "agent": agent,
                                "content": content[:100] + "..." if len(content) > 100 else content,
                                "finish_reason": finish_reason
                            })
                            print(f"✓ Received {agent} message")
                            
                    except json.JSONDecodeError:
                        pass
    
    if not interrupt_received:
        print("⚠️  No interrupt received, research may have failed")
        return
    
    # Step 2: Accept the plan and continue
    print(f"\n✓ Step 2: Accepting plan and continuing research...")
    data = {
        "messages": [],  # Empty messages for continuation
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
                            
                            # Check if it's a reporter message
                            if agent == "reporter" or ("# " in content and "## Key Points" in content):
                                print("✓ REPORTER MESSAGE DETECTED!")
                            
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
    await asyncio.sleep(3)
    
    # Step 3: Check if messages were saved
    print(f"\n✓ Step 3: Checking saved messages...")
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
                
                print("\nMessage breakdown:")
                role_counts = {}
                for msg in messages:
                    role = msg["role"]
                    role_counts[role] = role_counts.get(role, 0) + 1
                
                for role, count in role_counts.items():
                    print(f"  - {role}: {count}")
                
                # Check for reporter message
                reporter_saved = False
                for i, msg in enumerate(messages):
                    if msg["role"] == "assistant" and ("# " in msg["content"] and ("## Key Points" in msg["content"] or "trends" in msg["content"].lower())):
                        reporter_saved = True
                        print(f"\n✓ REPORTER MESSAGE FOUND IN DATABASE! (Message #{i+1})")
                        print(f"  Preview: {msg['content'][:300]}...")
                        break
                
                if not reporter_saved:
                    print("\n⚠️  Reporter message NOT found in saved messages")
                    print("\nAll saved messages:")
                    for i, msg in enumerate(messages):
                        content_preview = msg['content'][:150] + "..." if len(msg['content']) > 150 else msg['content']
                        print(f"  {i+1}. {msg['role']}: {content_preview}")
            else:
                print(f"Failed to get session details: {session_detail.status_code}")
        else:
            print(f"⚠️  Test session not found with thread_id: {thread_id}")
            print("Available sessions:")
            for s in sessions[:5]:
                print(f"  - {s['thread_id']}: {s.get('title', 'No title')[:50]}...")
    else:
        print(f"Failed to get sessions: {sessions_response.status_code}")

if __name__ == "__main__":
    asyncio.run(test_research_flow())