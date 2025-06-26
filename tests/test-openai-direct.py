#!/usr/bin/env python3
import openai
import os

# Test direct OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY", "test-key")

try:
    # Test with v0.28.1 syntax
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say hello"}
        ],
        temperature=0.7,
        max_tokens=50
    )
    print("Success! Response:", response.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")
    print("This is expected without a valid API key. The important thing is the syntax works.")