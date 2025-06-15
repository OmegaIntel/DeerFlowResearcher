#!/usr/bin/env python3
"""Test if reporter is invoked multiple times."""

import requests
import json
import time

print("=== Testing Reporter Invocations ===\n")

thread_id = "test-reporter-invocations"

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

# Track unique reporter start events
reporter_starts = []
reporter_ends = []

print("\n2. Processing initial response...")
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Check for reporter starting (first message from reporter)
                if data.get("agent") == "reporter" and data.get("content") and not data.get("finish_reason"):
                    msg_id = data.get("id")
                    if msg_id not in [r["id"] for r in reporter_starts]:
                        reporter_starts.append({
                            "id": msg_id,
                            "first_content": data.get("content", "")[:50]
                        })
                        print(f"   ✓ Reporter started: {msg_id[:8]}...")
                
                # Check for reporter ending
                if data.get("agent") == "reporter" and data.get("finish_reason"):
                    msg_id = data.get("id")
                    if msg_id not in [r["id"] for r in reporter_ends]:
                        reporter_ends.append({
                            "id": msg_id,
                            "finish_reason": data.get("finish_reason")
                        })
                        print(f"   ✓ Reporter finished: {msg_id[:8]}...")
                
                # Stop at interrupt
                if data.get("finish_reason") == "interrupt":
                    break
                    
            except:
                pass

response.close()

print(f"\nPhase 1 Summary:")
print(f"   - Reporter starts: {len(reporter_starts)}")
print(f"   - Reporter ends: {len(reporter_ends)}")

# Step 2: Accept plan and continue
print("\n3. Accepting plan and continuing research...")
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
print("\n4. Monitoring research execution...")
event_count = 0
for line in response2.iter_lines():
    if line and event_count < 10000:
        event_count += 1
        line_str = line.decode('utf-8')
        
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                # Check for reporter starting
                if data.get("agent") == "reporter" and data.get("content") and not data.get("finish_reason"):
                    msg_id = data.get("id")
                    if msg_id not in [r["id"] for r in reporter_starts]:
                        reporter_starts.append({
                            "id": msg_id,
                            "first_content": data.get("content", "")[:50]
                        })
                        print(f"   ✓ Reporter started: {msg_id[:8]}...")
                
                # Check for reporter ending
                if data.get("agent") == "reporter" and data.get("finish_reason"):
                    msg_id = data.get("id")
                    if msg_id not in [r["id"] for r in reporter_ends]:
                        reporter_ends.append({
                            "id": msg_id,
                            "finish_reason": data.get("finish_reason")
                        })
                        print(f"   ✓ Reporter finished: {msg_id[:8]}...")
                
                # Check for overall completion
                if data.get("finish_reason") in ["stop", "complete"]:
                    break
                    
            except:
                pass

response2.close()

# Final analysis
print("\n5. Final Analysis:")
print(f"   - Total unique reporter starts: {len(reporter_starts)}")
print(f"   - Total unique reporter ends: {len(reporter_ends)}")

if len(reporter_starts) > 0:
    print("\n   Reporter invocations:")
    for i, start in enumerate(reporter_starts):
        print(f"   {i+1}. ID: {start['id'][:8]}..., First content: '{start['first_content']}...'")

# Check for issues
if len(reporter_starts) > 1:
    print("\n❌ ISSUE: Reporter was invoked multiple times!")
    print("   This could cause duplicate reports in the UI.")
elif len(reporter_starts) == 1:
    print("\n✅ SUCCESS: Reporter was invoked exactly once as expected.")
else:
    print("\n⚠️  WARNING: Reporter was never invoked.")