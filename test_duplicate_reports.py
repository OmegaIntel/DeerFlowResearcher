#!/usr/bin/env python3
"""Test for duplicate report generation issue."""

import requests
import json
import time

print("=== Testing Duplicate Report Generation ===\n")

thread_id = "test-duplicate-reports"

# Step 1: Send research request
print("1. Sending research request...")
response = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest breakthroughs in quantum computing?"}],
    "tool_id": "research",
    "tool_type": "agent",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 3
}, stream=True)

# Track all messages by agent
agent_messages = {}
reporter_messages = []
message_ids = set()

print("\n2. Processing initial response and tracking agents...")
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Track messages by agent
                agent = data.get("agent")
                msg_id = data.get("id")
                
                if agent and msg_id:
                    if agent not in agent_messages:
                        agent_messages[agent] = []
                    
                    # Check for duplicate message IDs
                    if msg_id in message_ids:
                        print(f"   ⚠️  DUPLICATE MESSAGE ID: {msg_id} from agent: {agent}")
                    else:
                        message_ids.add(msg_id)
                    
                    agent_messages[agent].append({
                        "id": msg_id,
                        "content": data.get("content", "")[:50] + "..." if data.get("content") else "",
                        "streaming": not data.get("finish_reason")
                    })
                    
                    # Track reporter messages specifically
                    if agent == "reporter":
                        reporter_messages.append({
                            "id": msg_id,
                            "content_length": len(data.get("content", "")),
                            "has_finish_reason": bool(data.get("finish_reason"))
                        })
                
                # Stop at interrupt
                if data.get("finish_reason") == "interrupt":
                    print("   ✓ Interrupt received")
                    break
                    
            except:
                pass

response.close()

# Print agent summary
print("\n3. Agent Message Summary:")
for agent, messages in agent_messages.items():
    print(f"   - {agent}: {len(messages)} messages")
    if agent == "reporter":
        for i, msg in enumerate(messages[:5]):  # Show first 5
            print(f"     • Message {i+1}: ID={msg['id'][:8]}..., streaming={msg['streaming']}")

# Step 2: Accept plan and continue
print("\n4. Accepting plan and continuing research...")
time.sleep(0.5)

response2 = requests.post("http://localhost:8000/api/chat/tool", json={
    "thread_id": thread_id,
    "messages": [],
    "tool_id": "research",
    "tool_type": "agent",
    "interrupt_feedback": "accepted",
    "auto_accepted_plan": False,
    "enable_background_investigation": True,
    "max_plan_iterations": 3,
    "max_step_num": 3
}, stream=True)

# Continue tracking
second_phase_reporters = []
event_count = 0

print("\n5. Monitoring research execution...")
for line in response2.iter_lines():
    if line and event_count < 5000:
        event_count += 1
        line_str = line.decode('utf-8')
        
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                agent = data.get("agent")
                msg_id = data.get("id")
                
                if agent == "reporter" and msg_id:
                    # Check if this is a new reporter message
                    is_new = msg_id not in message_ids
                    message_ids.add(msg_id)
                    
                    second_phase_reporters.append({
                        "id": msg_id,
                        "is_new": is_new,
                        "content_preview": data.get("content", "")[:100] + "..." if data.get("content") else "",
                        "has_finish_reason": bool(data.get("finish_reason"))
                    })
                    
                    if is_new:
                        print(f"   ✓ New reporter message: {msg_id[:8]}...")
                    else:
                        print(f"   ⚠️  DUPLICATE reporter message: {msg_id[:8]}...")
                
                # Check for completion
                if data.get("finish_reason") in ["stop", "complete"]:
                    if data.get("agent") == "reporter":
                        print("   ✓ Reporter finished")
                    break
                    
            except:
                pass

response2.close()

# Final analysis
print("\n6. Report Generation Analysis:")
print(f"   - Total reporter messages in phase 1: {len(reporter_messages)}")
print(f"   - Total reporter messages in phase 2: {len(second_phase_reporters)}")
print(f"   - Combined total: {len(reporter_messages) + len(second_phase_reporters)}")

# Check for multiple complete reports
complete_reports = []
all_reports = reporter_messages + second_phase_reporters
current_report = []

for msg in all_reports:
    current_report.append(msg)
    if msg.get("has_finish_reason"):
        complete_reports.append(current_report)
        current_report = []

print(f"\n   - Complete reports found: {len(complete_reports)}")
for i, report in enumerate(complete_reports):
    total_content = sum(msg.get("content_length", 0) for msg in report)
    print(f"     • Report {i+1}: {len(report)} messages, ~{total_content} chars total")

# Determine if there's an issue
if len(complete_reports) > 1:
    print("\n❌ ISSUE CONFIRMED: Multiple complete reports are being generated!")
    print("   This explains why users see duplicate reports.")
else:
    print("\n✅ No duplicate reports detected in this test.")