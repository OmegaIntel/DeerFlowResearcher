#!/usr/bin/env python3
"""Test research flow with a business question that should trigger full research"""

import asyncio
import json
import aiohttp
from datetime import datetime

async def test_complete_research_flow():
    """Test with a business research question"""
    
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
        thread_id = f"business_research_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"\n[{datetime.now()}] 2. STARTING BUSINESS RESEARCH...")
        print(f"Thread ID: {thread_id}")
        
        # 3. Send a business research question similar to what worked
        research_request = {
            "messages": [
                {
                    "role": "user",
                    "content": "What is the average enterprise value for SaaS acquisitions in 2024?"
                }
            ],
            "thread_id": thread_id,
            "max_plan_iterations": 3,
            "max_step_num": 3,  # Limit steps like the successful example
            "auto_accepted_plan": False,  # Let's see the plan first
            "enable_background_investigation": True
        }
        
        print(f"✓ Sending business research request...")
        
        # Stream the response
        agent_messages = {}
        plan_received = False
        interrupt_occurred = False
        
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
                            print(f"✓ Received {agent} response (finish_reason: {finish_reason})")
                            
                            if finish_reason == "interrupt":
                                print(f"\n✓ Plan received, needs approval")
                                plan_received = True
                                interrupt_occurred = True
                                break
                            
                    except json.JSONDecodeError:
                        pass
        
        # 4. If plan was received, accept it and continue
        if plan_received:
            print(f"\n[{datetime.now()}] 3. ACCEPTING PLAN AND CONTINUING...")
            
            # Wait a moment
            await asyncio.sleep(2)
            
            # Send acceptance to continue the research
            acceptance_request = {
                "messages": [],  # Empty messages as we're continuing
                "thread_id": thread_id,
                "max_plan_iterations": 3,
                "max_step_num": 3,
                "auto_accepted_plan": True,
                "interrupt_feedback": "accepted",
                "enable_background_investigation": True
            }
            
            async with session.post(
                f"{base_url}/api/chat/stream",
                json=acceptance_request,
                headers=headers
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"Error continuing research: {error_text}")
                    return
                
                print(f"✓ Research continuing...")
                researcher_count = 0
                
                # Process remaining stream
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
                                
                                if agent == "researcher":
                                    researcher_count += 1
                                    print(f"  → Research step {researcher_count} completed")
                                
                                if agent == "reporter":
                                    print(f"  ✅ REPORTER MESSAGE RECEIVED! Full research flow completed!")
                                
                        except json.JSONDecodeError:
                            pass
        
        print(f"\n[{datetime.now()}] 4. RESEARCH COMPLETED!")
        
        # Show summary of agents
        print("\nAgent activity summary:")
        agent_summary = {}
        for key, msg in agent_messages.items():
            agent = msg['agent']
            if agent not in agent_summary:
                agent_summary[agent] = 0
            agent_summary[agent] += 1
        
        for agent, count in agent_summary.items():
            print(f"  - {agent}: {count} messages")
        
        # 5. Wait for DB commit
        print(f"\n[{datetime.now()}] 5. CHECKING SAVED MESSAGES...")
        await asyncio.sleep(5)
        
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
                print(f"  - Messages saved: {len(history['messages'])}")
                
                # Analyze message types
                message_analysis = []
                for i, msg in enumerate(history['messages']):
                    if msg['role'] == 'user':
                        message_analysis.append(f"Message {i+1}: USER - {msg['content'][:50]}...")
                    elif '"has_enough_context"' in msg['content']:
                        message_analysis.append(f"Message {i+1}: PLANNER - Plan with steps")
                    elif msg['content'].startswith('# '):
                        message_analysis.append(f"Message {i+1}: REPORTER - Final report")
                        # Show reporter preview
                        print(f"\n  Reporter content preview:")
                        print(f"  {msg['content'][:500]}...")
                    else:
                        message_analysis.append(f"Message {i+1}: OTHER - {msg['content'][:50]}...")
                
                print(f"\nMessage breakdown:")
                for analysis in message_analysis:
                    print(f"  - {analysis}")
                
                # Check if we have a complete flow
                has_reporter = any("REPORTER" in analysis for analysis in message_analysis)
                
                if has_reporter:
                    print(f"\n✅ SUCCESS: Complete research flow with reporter message saved!")
                else:
                    print(f"\n⚠️  WARNING: Research flow incomplete - no reporter message found")
                    
            else:
                print(f"❌ Failed to retrieve chat history: {resp.status}")
                error_text = await resp.text()
                print(f"Error: {error_text}")

if __name__ == "__main__":
    print("=" * 60)
    print("COMPLETE RESEARCH FLOW TEST")
    print("=" * 60)
    asyncio.run(test_complete_research_flow())
    print("=" * 60)