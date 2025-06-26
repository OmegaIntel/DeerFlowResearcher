#!/usr/bin/env python3
import sys
import os

print("Python version:", sys.version)
print("Working directory:", os.getcwd())

try:
    print("\n1. Testing imports...")
    from fastapi import FastAPI
    print("✓ FastAPI imported")
    
    from config import settings
    print("✓ Config imported")
    
    print("\n2. Testing database connection...")
    print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'Not set')}")
    
    print("\n3. Creating FastAPI app...")
    from api.main import app
    print("✓ App created successfully!")
    
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()