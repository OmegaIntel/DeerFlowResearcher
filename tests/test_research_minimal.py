#!/usr/bin/env python3
"""Test minimal research to avoid context length issues"""

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

async def test_research_tool():
    """Test research through tool endpoint"""
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create unique thread ID
    thread_id = f"test_minimal_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"\n[{datetime.now()}] Starting research with thread_id: {thread_id}")
    
    # Send a very simple research request
    data = {
        "messages": [{"role": "user", "content": "What is 2+2?"}],
        "thread_id": thread_id,
        "tool_id": "research",
        "tool_type": "agent",
        "auto_accepted_plan": True,  # Auto-accept to avoid interrupts
        "max_plan_iterations": 1,    # Limit iterations
        "max_step_num": 5            # Limit steps
    }
    
    print("✓ Sending minimal research request via /api/chat/tool...")
    report_found = False
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        # Send request
        async with client.stream(
            "POST",
            f"{BASE_URL}/api/chat/tool",
            json=data,
            headers=headers
        ) as response:
            print(f"Response status: {response.status_code}")
            event_count = 0
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    try:
                        event_data = json.loads(line[6:])
                        agent = event_data.get("agent", "unknown")
                        content = event_data.get("content", "")
                        finish_reason = event_data.get("finish_reason")
                        event_count += 1
                        
                        if finish_reason:
                            print(f"  Event {event_count}: {agent} - finish_reason={finish_reason}")
                            
                        if agent == "reporter" and content and len(content) > 100:
                            report_found = True
                            print(f"\n✓ REPORTER MESSAGE RECEIVED! Length: {len(content)}")
                            print(f"  Preview: {content[:200]}...")
                            
                    except json.JSONDecodeError:
                        pass
            
            if not report_found:
                print(f"\n⚠️  No reporter message received (total events: {event_count})")
    
    # Wait for DB save
    await asyncio.sleep(3)
    
    # Check if saved
    print(f"\n[{datetime.now()}] Checking if saved in database...")
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
            print(f"  Mode: {test_session['mode']}")
            print(f"  Title: {test_session.get('title', 'No title')[:80]}...")
            
            # Get session details
            session_detail = requests.get(
                f"{BASE_URL}/api/chat/sessions/{test_session['id']}",
                headers=headers
            )
            
            if session_detail.status_code == 200:
                detail = session_detail.json()
                messages = detail.get("messages", [])
                print(f"  Messages: {len(messages)}")
                
                # Check for reporter message
                reporter_saved = False
                for i, msg in enumerate(messages):
                    # Reporter messages are typically longer and contain markdown
                    if msg["role"] == "assistant" and len(msg["content"]) > 200:
                        reporter_saved = True
                        print(f"\n✓✓✓ REPORT MESSAGE FOUND IN DATABASE! (Message #{i+1})")
                        print(f"  Length: {len(msg['content'])} chars")
                        print(f"  Preview: {msg['content'][:200]}...")
                        break
                
                if not reporter_saved:
                    print("\n⚠️  Report message NOT found in database")
                    print("\nAll messages:")
                    for i, msg in enumerate(messages):
                        preview = msg['content'][:100] if len(msg['content']) > 100 else msg['content']
                        print(f"  {i+1}. {msg['role']}: {len(msg['content'])} chars - {preview}...")
                
                # Final verdict
                print("\n" + "="*60)
                if reporter_saved:
                    print("✅ SUCCESS: @research reports are now being saved!")
                else:
                    print("❌ FAILURE: @research reports still not saved")
                print("="*60)
                
            else:
                print(f"Failed to get session details: {session_detail.status_code}")
        else:
            print(f"⚠️  Test session not found with thread_id: {thread_id}")
    else:
        print(f"Failed to get sessions: {sessions_response.status_code}")

if __name__ == "__main__":
    asyncio.run(test_research_tool())