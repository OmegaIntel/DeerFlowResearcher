#!/usr/bin/env python3
"""Test script to debug citation handling"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE = "http://localhost:8000"
FRONTEND_BASE = "http://localhost:3000"

def log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")
    with open("logs/citation-test.log", "a") as f:
        f.write(f"[{timestamp}] {message}\n")

def test_citation_flow():
    """Test the citation flow end-to-end"""
    log("Starting citation flow test...")
    
    # First, let's check what documents are available
    headers = {
        "Authorization": "Bearer test-token"
    }
    
    # Test 1: Check if backend is running
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        log(f"Backend health check: {response.status_code}")
    except Exception as e:
        log(f"Backend not accessible: {e}")
        return
    
    # Test 2: Check frontend
    try:
        response = requests.get(FRONTEND_BASE, timeout=5)
        log(f"Frontend check: {response.status_code}")
    except Exception as e:
        log(f"Frontend not accessible: {e}")
    
    log("\nChecking recent backend logs for citation patterns...")
    
    # Let's also create a simple HTML test page
    test_html = """<!DOCTYPE html>
<html>
<head>
    <title>Citation Link Test</title>
    <script>
        console.log('[Test] Page loaded');
        
        // Monitor all link clicks
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                console.log('[Test] Link clicked:', {
                    href: e.target.href,
                    text: e.target.textContent,
                    target: e.target.target
                });
            }
        });
        
        // Monitor navigation
        window.addEventListener('beforeunload', function(e) {
            console.log('[Test] Navigating away to:', window.location.href);
        });
    </script>
</head>
<body>
    <h1>Citation Test Page</h1>
    <p>Test different link formats:</p>
    
    <h2>Markdown-style citation links (what might be generated):</h2>
    <div id="markdown-content">
        <p>Here is a reference [1](/document-viewer/test-doc-id)</p>
        <p>Another reference [Smith et al.](document-viewer/another-doc)</p>
        <p>External link [Google](https://google.com)</p>
    </div>
    
    <h2>After markdown processing:</h2>
    <div id="processed">
        <p>Here is a reference <a href="/document-viewer/test-doc-id">[1]</a></p>
        <p>Another reference <a href="document-viewer/another-doc">Smith et al.</a></p>
        <p>External link <a href="https://google.com" target="_blank">Google</a></p>
    </div>
    
    <script>
        // Log what happens when page loads
        document.querySelectorAll('a').forEach(link => {
            console.log('[Test] Found link:', {
                href: link.href,
                text: link.textContent,
                fullHref: link.getAttribute('href')
            });
        });
    </script>
</body>
</html>"""
    
    with open("logs/citation-test.html", "w") as f:
        f.write(test_html)
    log("Created test HTML at logs/citation-test.html")
    
    log("\nTest complete. Check logs/citation-test.log for details.")

if __name__ == "__main__":
    test_citation_flow()