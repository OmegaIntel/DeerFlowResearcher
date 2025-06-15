#!/usr/bin/env python3
"""Test complete research flow with proper interrupt handling."""

import requests
import json
import time

print("=== Testing Complete Research Flow ===\n")

thread_id = "test-complete-flow"

# Step 1: Send initial research request
print("1. Sending research request with @research...")
response1 = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest breakthroughs in quantum computing?"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 3
}, stream=True)

plan_received = False
interrupt_received = False

print("\n2. Processing initial response...")
for line in response1.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                if data.get("agent") == "planner" and data.get("content"):
                    plan_received = True
                    print("   ✓ Plan received from planner")
                    
                if data.get("finish_reason") == "interrupt":
                    interrupt_received = True
                    print("   ✓ Interrupt received - plan ready for review")
                    break
                    
            except:
                pass

response1.close()

if not plan_received or not interrupt_received:
    print("\n❌ ERROR: Plan or interrupt not received")
    exit(1)

# Step 2: Accept the plan and continue research
print("\n3. Accepting plan and continuing research...")
time.sleep(0.5)

# Send empty message with interrupt feedback to continue
response2 = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [],  # Empty messages when continuing
    "tool_id": "research",
    "tool_type": "agent",
    "interrupt_feedback": "accepted",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 3
}, stream=True)

agents_seen = []
tool_calls_seen = []
error_messages = []
final_report_received = False

print("\n4. Monitoring research execution...")
event_count = 0
for line in response2.iter_lines():
    if line and event_count < 2000:
        event_count += 1
        line_str = line.decode('utf-8')
        
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Track agents
                if agent := data.get("agent"):
                    if agent not in agents_seen:
                        agents_seen.append(agent)
                        print(f"   ✓ Agent active: {agent}")
                
                # Track errors
                if "error" in str(data.get("content", "")).lower():
                    error_messages.append(data.get("content"))
                    
                # Check for "haven't entered any text" error
                if "haven't entered any text" in str(data.get("content", "")):
                    print("\n❌ ERROR: Got 'haven't entered any text' message")
                    print("   This indicates the flow is not continuing properly")
                    break
                    
                # Track tool calls
                if "tool_calls" in data:
                    for tool_call in data.get("tool_calls", []):
                        if tool_name := tool_call.get("name"):
                            if tool_name not in tool_calls_seen:
                                tool_calls_seen.append(tool_name)
                                print(f"   ✓ Tool called: {tool_name}")
                
                # Check for final report
                if data.get("agent") == "reporter":
                    final_report_received = True
                    
                # Check for completion
                if data.get("finish_reason") in ["stop", "complete"]:
                    print("\n5. Research workflow completed")
                    break
                    
            except:
                pass

response2.close()

# Final summary
print(f"\n6. Execution Summary:")
print(f"   - Agents involved: {', '.join(agents_seen) if agents_seen else 'None'}")
print(f"   - Tools used: {', '.join(tool_calls_seen) if tool_calls_seen else 'None'}")
print(f"   - Final report generated: {'✅' if final_report_received else '❌'}")

if error_messages:
    print(f"\n   - Errors encountered:")
    for err in error_messages[:3]:  # Show first 3 errors
        print(f"     • {err}")

# Determine success
success = (
    len(agents_seen) > 1 and 
    len(tool_calls_seen) > 0 and 
    "haven't entered any text" not in ' '.join(error_messages)
)

if success:
    print("\n✅ SUCCESS: Complete research flow is working correctly!")
else:
    print("\n❌ FAIL: Research flow encountered issues")
    if "haven't entered any text" in ' '.join(error_messages):
        print("   - The flow is not continuing properly after plan acceptance")
    if len(agents_seen) <= 1:
        print("   - Research agents did not execute")
    if len(tool_calls_seen) == 0:
        print("   - No tools were used")