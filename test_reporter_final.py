#!/usr/bin/env python3
"""Final test to verify reporter messages are saved and streamed"""

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

async def test_simple_research():
    """Test simple research with auto-accepted plan"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create unique thread ID
    thread_id = f"test_final_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"\n[{datetime.now()}] Starting research with thread_id: {thread_id}")
    
    # Send research request with auto-accepted plan
    data = {
        "messages": [{"role": "user", "content": "What is quantum computing?"}],
        "thread_id": thread_id,
        "auto_accepted_plan": True  # This should skip interrupt
    }
    
    print("✓ Sending research request with auto_accepted_plan=True...")
    all_messages = []
    reporter_received = False
    
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
                        
                        if content:
                            all_messages.append({
                                "agent": agent,
                                "content_length": len(content),
                                "is_report": "# " in content and len(content) > 500
                            })
                        
                        if finish_reason:
                            print(f"  {agent}: finish_reason={finish_reason}, content_length={len(content)}")
                            
                        # Check for reporter message
                        if agent == "reporter" and content and len(content) > 500:
                            reporter_received = True
                            print(f"\n✓ REPORTER MESSAGE RECEIVED! Length: {len(content)}")
                            print(f"  Preview: {content[:200]}...")
                            
                    except json.JSONDecodeError:
                        pass
    
    print(f"\n[{datetime.now()}] Streaming completed!")
    
    # Summary
    print(f"\nTotal messages received: {len(all_messages)}")
    agent_summary = {}
    for msg in all_messages:
        agent = msg["agent"]
        agent_summary[agent] = agent_summary.get(agent, 0) + 1
    
    print("\nMessages by agent:")
    for agent, count in agent_summary.items():
        print(f"  - {agent}: {count}")
    
    # Check for large messages that might be reports
    large_messages = [msg for msg in all_messages if msg["content_length"] > 500]
    print(f"\nLarge messages (>500 chars): {len(large_messages)}")
    for msg in large_messages:
        print(f"  - {msg['agent']}: {msg['content_length']} chars (report: {msg['is_report']})")
    
    if not reporter_received:
        print("\n⚠️  Reporter message NOT received in stream")
    
    # Wait for DB save
    await asyncio.sleep(3)
    
    # Check if saved in database
    print(f"\n[{datetime.now()}] Checking database...")
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
                for i, msg in enumerate(messages):
                    if msg["role"] == "assistant" and len(msg["content"]) > 500 and "# " in msg["content"]:
                        reporter_saved = True
                        print(f"\n✓✓✓ REPORTER MESSAGE FOUND IN DATABASE! (Message #{i+1})")
                        print(f"  Length: {len(msg['content'])} chars")
                        print(f"  Preview: {msg['content'][:200]}...")
                        break
                
                if not reporter_saved:
                    print("\n⚠️  Reporter message NOT found in database")
                    print("\nAll messages in DB:")
                    for i, msg in enumerate(messages):
                        print(f"  {i+1}. {msg['role']}: {len(msg['content'])} chars")
                
                # Final verdict
                print("\n" + "="*60)
                if reporter_received and reporter_saved:
                    print("✅ SUCCESS: Reporter message was both streamed and saved!")
                elif reporter_saved and not reporter_received:
                    print("⚠️  PARTIAL SUCCESS: Reporter message saved but not streamed")
                elif reporter_received and not reporter_saved:
                    print("❌ ISSUE: Reporter message streamed but not saved")
                else:
                    print("❌ FAILURE: Reporter message neither streamed nor saved")
                print("="*60)
                
            else:
                print(f"Failed to get session details: {session_detail.status_code}")
        else:
            print(f"⚠️  Test session not found with thread_id: {thread_id}")
    else:
        print(f"Failed to get sessions: {sessions_response.status_code}")

if __name__ == "__main__":
    asyncio.run(test_simple_research())