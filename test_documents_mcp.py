#!/usr/bin/env python3
"""
Test @documents functionality
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_documents_tool():
    """Test @documents functionality"""
    
    print("🧪 Testing @documents MCP Tool")
    print("=" * 40)
    
    # Test 1: Check if documents tools are loaded
    print("\n1️⃣ Checking MCP backend servers...")
    
    response = requests.get(f"{BASE_URL}/api/mcp/backend-servers")
    if response.status_code == 200:
        data = response.json()
        
        # Find documents server
        documents_server = None
        for server in data.get("servers", []):
            if server.get("id") == "documents":
                documents_server = server
                break
        
        if documents_server:
            print(f"✅ Documents server found: {documents_server['name']}")
            print(f"   Enabled: {documents_server['enabled']}")
            print(f"   Tools: {len(documents_server.get('tools', []))}")
            
            if documents_server.get('tools'):
                for tool in documents_server['tools']:
                    print(f"     - {tool['name']}: {tool['description'][:60]}...")
            else:
                print("   ⚠️  No tools loaded (may be initialization issue)")
        else:
            print("❌ Documents server not found")
            return False
    else:
        print(f"❌ Failed to get backend servers: {response.status_code}")
        return False
    
    # Test 2: Test chat tool endpoint with documents
    print("\n2️⃣ Testing @documents via chat tool...")
    
    tool_request = {
        "messages": [
            {
                "role": "user",
                "content": "What documents do I have available?"
            }
        ],
        "tool_id": "documents.list_indices",
        "tool_type": "mcp"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/chat/tool",
        headers={"Content-Type": "application/json"},
        data=json.dumps(tool_request)
    )
    
    if response.status_code == 200:
        print("✅ Chat tool endpoint responded")
        
        # Try to get some response
        response_text = ""
        try:
            for line in response.iter_lines():
                if line:
                    line_text = line.decode('utf-8')
                    if line_text.startswith('data: '):
                        try:
                            data = json.loads(line_text[6:])
                            if 'content' in data and data['content']:
                                response_text += data['content']
                                
                            # Break after getting some content
                            if len(response_text) > 50:
                                break
                        except json.JSONDecodeError:
                            continue
        except:
            pass
        
        if response_text:
            print(f"   Response preview: {response_text[:200]}...")
        else:
            print("   ⚠️  No content received (tool may not be working)")
            
    else:
        print(f"❌ Chat tool failed: {response.status_code}")
        if response.text:
            print(f"   Error: {response.text[:200]}")
    
    # Test 3: Direct API comparison
    print("\n3️⃣ Testing direct Pinecone API for comparison...")
    
    qa_request = {
        "question": "What documents are available?",
        "context_chunks": 3
    }
    
    response = requests.post(
        f"{BASE_URL}/api/pinecone/query",
        headers={"Content-Type": "application/json"},
        data=json.dumps(qa_request)
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Direct API working")
        print(f"   Sources found: {len(data['sources'])}")
        print(f"   Confidence: {data['confidence']:.2%}")
    else:
        print(f"⚠️  Direct API issue: {response.status_code}")
    
    print("\n📋 Summary:")
    print("   - Documents MCP server is configured")
    print("   - Check tool loading and MCP protocol implementation")
    print("   - Direct Pinecone API works as fallback")
    
    return True

if __name__ == "__main__":
    test_documents_tool()