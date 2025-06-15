#!/usr/bin/env python3
"""Test the UI research flow with Investigation toggle."""

import requests
import json
import time

print("=== Testing UI Research Flow with Investigation Toggle ===\n")

thread_id = "test-ui-flow"

# Step 1: Test with Investigation toggle ON (this should trigger research flow)
print("1. Testing with Investigation toggle ON...")
response = requests.post("http://localhost:8000/api/chat/stream", json={
    "thread_id": thread_id,
    "messages": [{"role": "user", "content": "What are the latest breakthroughs in quantum computing?"}],
    "auto_accepted_plan": False,
    "enable_background_investigation": True,  # Investigation toggle ON
    "max_plan_iterations": 3,
    "max_step_num": 3
}, stream=True)

plan_received = False
interrupt_received = False

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                if data.get("agent") == "planner":
                    plan_received = True
                    print("   ✓ Plan received from planner (research flow triggered!)")
                    
                if data.get("finish_reason") == "interrupt":
                    interrupt_received = True
                    print("   ✓ Interrupt received - ready for plan review")
                    break
                    
            except:
                pass

response.close()

if plan_received and interrupt_received:
    print("\n✅ SUCCESS: Investigation toggle correctly triggers research flow!")
else:
    print("\n❌ FAIL: Investigation toggle did not trigger research flow")

# Step 2: Test with Investigation toggle OFF (should use simple chat)
print("\n2. Testing with Investigation toggle OFF...")
response = requests.post("http://localhost:8000/api/chat/simple", json={
    "thread_id": "test-simple-chat",
    "messages": [{"role": "user", "content": "What are the latest breakthroughs in quantum computing?"}]
}, stream=True)

simple_response_received = False

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith("data: "):
            try:
                data = json.loads(line_str[6:])
                
                if data.get("role") == "assistant" and data.get("content"):
                    simple_response_received = True
                    print("   ✓ Simple chat response received")
                    break
                    
            except:
                pass

response.close()

if simple_response_received:
    print("\n✅ SUCCESS: Simple chat flow works when Investigation is OFF!")
else:
    print("\n❌ FAIL: Simple chat flow did not work properly")

print("\n=== All UI Research Flow Tests Completed ===")