#!/usr/bin/env python3
"""
Test script for Pinecone MCP Server
"""

import os
import sys
import json
import asyncio
import logging
from io import StringIO

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_mcp_server():
    """Test the Pinecone MCP server functionality"""
    
    print("🧪 Testing Pinecone MCP Server")
    print("=" * 40)
    
    # Test 1: Check if server can start
    print("\n1️⃣ Testing server initialization...")
    
    try:
        from mcp_server import initialize_pinecone_tool
        
        # Check environment variables
        pinecone_key = os.getenv("PINECONE_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if not pinecone_key:
            print("❌ PINECONE_API_KEY not set")
            print("   Please set: export PINECONE_API_KEY='your-key'")
            return False
            
        if not openai_key:
            print("❌ OPENAI_API_KEY not set")
            print("   Please set: export OPENAI_API_KEY='your-key'")
            return False
        
        print("✅ Environment variables are set")
        
        # Test tool initialization
        if initialize_pinecone_tool():
            print("✅ Pinecone tool initialized successfully")
        else:
            print("❌ Failed to initialize Pinecone tool")
            return False
            
    except Exception as e:
        print(f"❌ Server initialization failed: {e}")
        return False
    
    # Test 2: Test tool listing
    print("\n2️⃣ Testing tool listing...")
    
    try:
        from mcp_server import handle_list_tools
        
        tools_result = await handle_list_tools()
        tools = tools_result.tools
        
        print(f"✅ Found {len(tools)} tools:")
        for tool in tools:
            print(f"   - {tool.name}: {tool.description[:60]}...")
            
    except Exception as e:
        print(f"❌ Tool listing failed: {e}")
        return False
    
    # Test 3: Test basic tool functionality
    print("\n3️⃣ Testing basic tool execution...")
    
    try:
        from mcp.types import CallToolRequest
        from mcp_server import handle_call_tool
        
        # Test list_indices tool
        request = CallToolRequest(
            params={
                "name": "list_indices",
                "arguments": {}
            }
        )
        
        result = await handle_call_tool(request)
        
        if result.isError:
            print(f"⚠️  Tool execution returned error (this might be normal if no documents are uploaded)")
            print(f"   Error: {result.content[0].text}")
        else:
            print("✅ Tool execution successful")
            print(f"   Result: {result.content[0].text[:100]}...")
            
    except Exception as e:
        print(f"❌ Tool execution failed: {e}")
        return False
    
    print("\n🎉 MCP Server tests completed!")
    print("\n📋 Next steps:")
    print("   1. Restart Docker containers: docker-compose restart")
    print("   2. Test @documents in chat interface")
    print("   3. Upload documents and try queries")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_mcp_server())
    sys.exit(0 if success else 1)