#!/usr/bin/env python3
"""Test simple research with a question that should have enough context"""

import asyncio
import json
import aiohttp
from datetime import datetime

async def test_simple_research():
    """Test with a simple question that doesn't need research"""
    
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
        thread_id = f"simple_research_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"\n[{datetime.now()}] 2. STARTING SIMPLE RESEARCH...")
        print(f"Thread ID: {thread_id}")
        
        # 3. Send a simple request that shouldn't need research
        research_request = {
            "messages": [
                {
                    "role": "user",
                    "content": "Summarize what DeerFlow is based on what you know."
                }
            ],
            "thread_id": thread_id,
            "max_plan_iterations": 3,
            "max_step_num": 5,
            "auto_accepted_plan": True,  # Auto accept to see full flow
            "enable_background_investigation": False
        }
        
        print(f"✓ Sending simple research request...")
        
        # Stream the response
        agent_messages = {}
        
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
                            print(f"✓ Received {agent} response")
                            
                    except json.JSONDecodeError:
                        pass
        
        print(f"\n[{datetime.now()}] 3. RESEARCH COMPLETED!")
        print("\nMessages received from agents:")
        for key, msg in agent_messages.items():
            agent = msg['agent']
            content_len = len(msg['content'])
            print(f"  - {agent}: {content_len} characters")
            
            # Print planner response to check has_enough_context
            if agent == "planner" and content_len > 0:
                try:
                    plan_data = json.loads(msg['content'])
                    print(f"    Plan has_enough_context: {plan_data.get('has_enough_context', 'NOT FOUND')}")
                except:
                    pass
        
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
                    print(f"\n✅ SUCCESS: Reporter message found and saved!")
                    # Print reporter content preview
                    for msg in history['messages']:
                        if msg['content'].startswith('# '):
                            print(f"\nReporter message preview:")
                            print(f"{msg['content'][:500]}...")
                else:
                    print(f"\n⚠️  WARNING: No reporter message found in saved messages")
                    
            else:
                print(f"❌ Failed to retrieve chat history: {resp.status}")
                error_text = await resp.text()
                print(f"Error: {error_text}")

if __name__ == "__main__":
    print("=" * 60)
    print("SIMPLE RESEARCH TEST")
    print("=" * 60)
    asyncio.run(test_simple_research())
    print("=" * 60)