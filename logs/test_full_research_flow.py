#!/usr/bin/env python3
"""Test the full research flow including reporter message"""

import asyncio
import json
import aiohttp
from datetime import datetime

async def test_full_research_flow():
    """Test complete research flow with auto-accepted plan"""
    
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
        thread_id = f"full_research_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"\n[{datetime.now()}] 2. STARTING FULL RESEARCH...")
        print(f"Thread ID: {thread_id}")
        
        # 3. Send research request with auto_accepted_plan=False to see full flow
        research_request = {
            "messages": [
                {
                    "role": "user",
                    "content": "What are the top 3 programming languages in 2024?"
                }
            ],
            "thread_id": thread_id,
            "max_plan_iterations": 3,
            "max_step_num": 5,  # Limit steps for faster completion
            "auto_accepted_plan": False,  # This will show us the plan
            "enable_background_investigation": False
        }
        
        print(f"✓ Sending research request (manual plan acceptance)...")
        
        # Stream the response
        agent_messages = {}
        plan_received = False
        
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
                        
                        # Check for interrupt (plan approval needed)
                        if finish_reason == "interrupt":
                            print(f"\n✓ Plan received, needs approval")
                            plan_received = True
                            break
                        
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
        
        # 4. Accept the plan and continue
        if plan_received:
            print(f"\n[{datetime.now()}] 3. ACCEPTING PLAN AND CONTINUING...")
            
            # Send acceptance
            acceptance_request = {
                "messages": [],  # Empty message to continue
                "thread_id": thread_id,
                "max_plan_iterations": 3,
                "max_step_num": 5,
                "auto_accepted_plan": True,
                "interrupt_feedback": "accepted",
                "enable_background_investigation": False
            }
            
            async with session.post(
                f"{base_url}/api/chat/stream",
                json=acceptance_request,
                headers=headers
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"Error: {error_text}")
                    return
                
                # Process remaining stream (researcher, reporter)
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
        
        print(f"\n[{datetime.now()}] 4. RESEARCH COMPLETED!")
        print("\nMessages received from agents:")
        for key, msg in agent_messages.items():
            agent = msg['agent']
            content_len = len(msg['content'])
            print(f"  - {agent}: {content_len} characters")
        
        # 5. Wait for DB commit
        print(f"\n[{datetime.now()}] 5. CHECKING SAVED MESSAGES...")
        await asyncio.sleep(3)
        
        # 6. Retrieve the saved session
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
                    content = msg['content']
                    
                    # Try to detect agent type from content
                    agent_type = "unknown"
                    if '"locale"' in content and '"steps"' in content:
                        agent_type = "planner"
                    elif content.startswith("# "):
                        agent_type = "reporter"
                    elif msg['role'] == "user":
                        agent_type = "user"
                    
                    print(f"    - Agent type: {agent_type}")
                    print(f"    - Content preview: {content[:100]}...")
                    print(f"    - Length: {len(content)} characters")
                
                # Check if we have a reporter message
                has_reporter = any("# " in msg['content'] for msg in history['messages'] if msg['role'] == 'assistant')
                
                if has_reporter:
                    print(f"\n✅ SUCCESS: Full research flow completed with reporter message saved!")
                else:
                    print(f"\n⚠️  WARNING: Research completed but no reporter message found in saved messages")
                    
            else:
                print(f"❌ Failed to retrieve chat history: {resp.status}")
                error_text = await resp.text()
                print(f"Error: {error_text}")

if __name__ == "__main__":
    print("=" * 60)
    print("FULL RESEARCH FLOW TEST")
    print("=" * 60)
    asyncio.run(test_full_research_flow())
    print("=" * 60)