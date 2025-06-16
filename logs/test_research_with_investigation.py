#!/usr/bin/env python3
"""Test research with background investigation enabled"""

import asyncio
import json
import aiohttp
from datetime import datetime

async def test_research_with_investigation():
    """Test with background investigation enabled"""
    
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
        thread_id = f"investigation_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"\n[{datetime.now()}] 2. STARTING RESEARCH WITH INVESTIGATION...")
        print(f"Thread ID: {thread_id}")
        
        # 3. Send request with background investigation enabled
        research_request = {
            "messages": [
                {
                    "role": "user",
                    "content": "What are the latest AI breakthroughs in 2024?"
                }
            ],
            "thread_id": thread_id,
            "max_plan_iterations": 3,
            "max_step_num": 3,  # Limit steps for faster completion
            "auto_accepted_plan": True,
            "enable_background_investigation": True,  # This should trigger full research
            "interrupt_feedback": None
        }
        
        print(f"✓ Sending research request with investigation enabled...")
        
        # Stream the response
        agent_messages = {}
        message_count = 0
        
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
                            message_count += 1
                            print(f"✓ [{message_count}] Received {agent} response (finish_reason: {finish_reason})")
                            
                            # If we see a reporter message, we know the full flow worked
                            if agent == "reporter":
                                print(f"  ✅ REPORTER MESSAGE RECEIVED! Research flow is working.")
                            
                    except json.JSONDecodeError:
                        pass
        
        print(f"\n[{datetime.now()}] 3. STREAM COMPLETED!")
        print("\nMessages received from agents:")
        for key, msg in agent_messages.items():
            agent = msg['agent']
            content_len = len(msg['content'])
            print(f"  - {agent}: {content_len} characters")
            
            # Show preview of reporter content
            if agent == "reporter" and content_len > 0:
                print(f"\n  Reporter preview: {msg['content'][:200]}...")
        
        # 4. Wait for DB commit
        print(f"\n[{datetime.now()}] 4. CHECKING SAVED MESSAGES...")
        await asyncio.sleep(3)
        
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
                print(f"  - Mode: {history['mode']}")
                print(f"  - Messages saved: {len(history['messages'])}")
                
                # Check message types
                message_types = []
                for msg in history['messages']:
                    if msg['role'] == 'user':
                        message_types.append('user')
                    elif '"locale"' in msg['content'] and '"steps"' in msg['content']:
                        message_types.append('planner')
                    elif msg['content'].startswith('# '):
                        message_types.append('reporter')
                    else:
                        message_types.append('other')
                
                print(f"  - Message types: {message_types}")
                
                # Check if we have a reporter message
                has_reporter = 'reporter' in message_types
                
                if has_reporter:
                    print(f"\n✅ SUCCESS: Full research flow completed with reporter message saved!")
                    # Find and print the reporter message
                    for i, msg in enumerate(history['messages']):
                        if msg['content'].startswith('# '):
                            print(f"\n  Reporter message (Message {i+1}):")
                            print(f"    Length: {len(msg['content'])} characters")
                            print(f"    Preview: {msg['content'][:300]}...")
                else:
                    print(f"\n⚠️  WARNING: No reporter message found in saved messages")
                    print(f"\n  Checking all message contents:")
                    for i, msg in enumerate(history['messages']):
                        print(f"\n  Message {i+1} ({msg['role']}):")
                        print(f"    Content preview: {msg['content'][:150]}...")
                    
            else:
                print(f"❌ Failed to retrieve chat history: {resp.status}")
                error_text = await resp.text()
                print(f"Error: {error_text}")

if __name__ == "__main__":
    print("=" * 60)
    print("RESEARCH WITH INVESTIGATION TEST")
    print("=" * 60)
    asyncio.run(test_research_with_investigation())
    print("=" * 60)