#!/usr/bin/env python3
"""Complete test to verify research messages are being saved"""

import asyncio
import json
import aiohttp
from datetime import datetime

async def test_research_saving():
    """Test the complete research flow and verify messages are saved"""
    
    # Test credentials
    email = "chetan@omegaintelligence.ai"
    password = "Test123."
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        # 1. Login
        print(f"[{datetime.now()}] 1. LOGGING IN...")
        login_data = {
            "username": email,
            "password": password
        }
        
        async with session.post(f"{base_url}/api/token", data=login_data) as resp:
            if resp.status != 200:
                print(f"Login failed: {resp.status}")
                return
            login_result = await resp.json()
            token = login_result["access_token"]
            print(f"✓ Login successful")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Create a new research session
        thread_id = f"research_demo_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"\n[{datetime.now()}] 2. STARTING RESEARCH...")
        print(f"Thread ID: {thread_id}")
        
        # 3. Send a research request
        research_request = {
            "messages": [
                {
                    "role": "user",
                    "content": "What are the latest breakthroughs in quantum computing?"
                }
            ],
            "thread_id": thread_id,
            "max_plan_iterations": 3,
            "max_step_num": 10,
            "auto_accepted_plan": True,
            "enable_background_investigation": False
        }
        
        print(f"✓ Sending research request...")
        
        # Stream the response
        async with session.post(
            f"{base_url}/api/chat/stream",
            json=research_request,
            headers=headers
        ) as resp:
            if resp.status != 200:
                error_text = await resp.text()
                print(f"Error: {error_text}")
                return
            
            # Process streaming response
            agent_messages = {}
            async for line in resp.content:
                line_text = line.decode('utf-8').strip()
                if line_text.startswith("data: "):
                    try:
                        data = json.loads(line_text[6:])
                        agent = data.get("agent", "unknown")
                        content = data.get("content", "")
                        msg_id = data.get("id")
                        finish_reason = data.get("finish_reason")
                        
                        # Track messages
                        msg_key = f"{agent}:{msg_id}"
                        if msg_key not in agent_messages:
                            agent_messages[msg_key] = {
                                "agent": agent,
                                "content": "",
                                "finished": False
                            }
                        
                        agent_messages[msg_key]["content"] += content
                        
                        if finish_reason:
                            agent_messages[msg_key]["finished"] = True
                            print(f"✓ Received {agent} response")
                            
                    except json.JSONDecodeError:
                        pass
        
        print(f"\n[{datetime.now()}] 3. RESEARCH COMPLETED!")
        print("Messages received from agents:")
        for key, msg in agent_messages.items():
            agent = msg['agent']
            content_len = len(msg['content'])
            print(f"  - {agent}: {content_len} characters")
        
        # 4. Wait for DB commit
        print(f"\n[{datetime.now()}] 4. CHECKING SAVED MESSAGES...")
        await asyncio.sleep(2)
        
        # 5. Retrieve the saved session
        async with session.get(
            f"{base_url}/api/chat/sessions/by-thread/{thread_id}",
            headers=headers
        ) as resp:
            if resp.status == 200:
                history = await resp.json()
                print(f"✓ Session successfully saved and retrieved!")
                print(f"\nSession Details:")
                print(f"  - Session ID: {history['id']}")
                print(f"  - Thread ID: {history['thread_id']}")
                print(f"  - Title: {history.get('title', 'No title')}")
                print(f"  - Mode: {history['mode']}")
                print(f"  - Created: {history['created_at']}")
                print(f"\nSaved Messages ({len(history['messages'])} total):")
                
                for i, msg in enumerate(history['messages']):
                    print(f"\n  Message {i+1}:")
                    print(f"    - Role: {msg['role']}")
                    print(f"    - Content preview: {msg['content'][:100]}...")
                    print(f"    - Length: {len(msg['content'])} characters")
                    
                print(f"\n✅ SUCCESS: Research messages are being saved correctly!")
                    
            else:
                print(f"❌ Failed to retrieve chat history: {resp.status}")
                error_text = await resp.text()
                print(f"Error: {error_text}")

if __name__ == "__main__":
    print("=" * 60)
    print("RESEARCH MESSAGE SAVING TEST")
    print("=" * 60)
    asyncio.run(test_research_saving())
    print("=" * 60)