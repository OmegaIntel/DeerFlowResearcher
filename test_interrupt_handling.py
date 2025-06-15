#!/usr/bin/env python3
"""Test interrupt handling in the research flow."""

import requests
import json
import uuid

CHAT_URL = "http://localhost:8000/api/chat/stream"

print("=== Testing Interrupt Handling ===\n")

thread_id = f"interrupt-{uuid.uuid4().hex[:8]}"

# Send research request
print("1. Sending research request (expecting interrupt)...")
response = requests.post(CHAT_URL, json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "Research SaaS company valuations"}],
    "auto_accepted_plan": False,  # This should trigger interrupt
    "enable_background_investigation": True
}, stream=True)

interrupt_received = False
interrupt_data = None
seen_events = set()

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        # Debug: print unique events
        if line_str.startswith("event:"):
            event_type = line_str.strip()
            if event_type not in seen_events:
                seen_events.add(event_type)
                print(f"   New event type: {event_type}")
        
        if line_str.startswith("event: interrupt"):
            interrupt_received = True
            print("   ✅ Interrupt event received")
        elif line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                # Check for interrupt in different ways
                if data.get("finish_reason") == "interrupt":
                    interrupt_data = data
                    interrupt_received = True
                    print(f"   ✅ Interrupt data found")
                    print(f"   Interrupt ID: {data.get('id', 'N/A')}")
                    print(f"   Options: {data.get('options', [])}")
                    break
                    
                # Also check if this is the last message with interrupt info
                if data.get("agent") == "planner" and data.get("finish_reason") == "stop":
                    print(f"   Plan completed, checking for interrupt...")
                    # Don't break, continue to see if interrupt comes next
            except:
                pass

print(f"\n2. Interrupt handling test result:")
print(f"   Interrupt received: {'✅' if interrupt_received else '❌'}")
print(f"   Interrupt data valid: {'✅' if interrupt_data and 'id' in interrupt_data else '❌'}")

if interrupt_received and interrupt_data:
    print("\n✅ SUCCESS: Interrupt handling is working correctly!")
    print("The fix properly handles different interrupt data structures.")
else:
    print("\n❌ FAILED: Interrupt handling has issues.")