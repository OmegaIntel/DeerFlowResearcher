#!/usr/bin/env python3
"""Test script to verify research messages are being saved"""

import asyncio
import json
import aiohttp
from datetime import datetime

async def test_research_flow():
    """Test the research flow and check if messages are saved"""
    
    # Test credentials
    email = "chetan@omegaintelligence.ai"
    password = "Test123."
    
    base_url = "http://localhost:8000"
    
    async with aiohttp.ClientSession() as session:
        # 1. Login
        print(f"[{datetime.now()}] Logging in...")
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
            print(f"[{datetime.now()}] Login successful")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Create a new research session
        thread_id = f"research_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"[{datetime.now()}] Starting research with thread_id: {thread_id}")
        
        # 3. Send a research request
        research_request = {
            "messages": [
                {
                    "role": "user",
                    "content": "What are the key trends in AI research for 2024?"
                }
            ],
            "thread_id": thread_id,
            "max_plan_iterations": 3,
            "max_step_num": 10,
            "auto_accepted_plan": True,
            "enable_background_investigation": False
        }
        
        print(f"[{datetime.now()}] Sending research request...")
        
        # Stream the response
        async with session.post(
            f"{base_url}/api/chat/stream",
            json=research_request,
            headers=headers
        ) as resp:
            print(f"[{datetime.now()}] Response status: {resp.status}")
            
            if resp.status != 200:
                error_text = await resp.text()
                print(f"Error: {error_text}")
                return
            
            # Process streaming response
            agent_messages = {}
            async for line in resp.content:
                line_text = line.decode('utf-8').strip()
                if line_text.startswith("event: message_chunk"):
                    # Get the next line which contains the data
                    continue
                elif line_text.startswith("data: "):
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
                            print(f"[{datetime.now()}] Completed {agent} message (length: {len(agent_messages[msg_key]['content'])})")
                            
                    except json.JSONDecodeError:
                        pass
        
        print(f"\n[{datetime.now()}] Research completed!")
        print("Messages received:")
        for key, msg in agent_messages.items():
            print(f"  - {msg['agent']}: {len(msg['content'])} chars, finished: {msg['finished']}")
        
        # 4. Wait a moment for DB to commit
        await asyncio.sleep(2)
        
        # 5. Check if messages were saved by retrieving chat history
        print(f"\n[{datetime.now()}] Checking chat history...")
        
        async with session.get(
            f"{base_url}/api/chat-history/sessions/by-thread/{thread_id}",
            headers=headers
        ) as resp:
            if resp.status == 200:
                history = await resp.json()
                print(f"[{datetime.now()}] Chat session found!")
                print(f"  - Session ID: {history['id']}")
                print(f"  - Title: {history.get('title', 'No title')}")
                print(f"  - Mode: {history['mode']}")
                print(f"  - Messages saved: {len(history['messages'])}")
                
                for i, msg in enumerate(history['messages']):
                    print(f"\n  Message {i+1}:")
                    print(f"    - Role: {msg['role']}")
                    print(f"    - Content: {msg['content'][:100]}...")
                    print(f"    - Created: {msg['created_at']}")
                    
            else:
                print(f"Failed to retrieve chat history: {resp.status}")
                error_text = await resp.text()
                print(f"Error: {error_text}")

if __name__ == "__main__":
    asyncio.run(test_research_flow())