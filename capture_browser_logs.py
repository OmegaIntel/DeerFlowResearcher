#!/usr/bin/env python3
"""Capture browser console logs and network activity"""

import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime

async def capture_citation_click():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        
        # Enable console and network logging
        page = await context.new_page()
        
        logs = []
        
        # Capture console logs
        page.on("console", lambda msg: logs.append({
            "type": "console",
            "level": msg.type,
            "text": msg.text,
            "time": datetime.now().isoformat()
        }))
        
        # Capture network requests
        page.on("request", lambda req: logs.append({
            "type": "request",
            "method": req.method,
            "url": req.url,
            "time": datetime.now().isoformat()
        }))
        
        # Capture navigation
        page.on("framenavigated", lambda frame: logs.append({
            "type": "navigation",
            "url": frame.url,
            "time": datetime.now().isoformat()
        }))
        
        # Navigate to the app
        await page.goto("http://localhost:3000")
        
        print("Browser opened. Please:")
        print("1. Login if needed")
        print("2. Navigate to a chat with citations")
        print("3. Click on a citation that causes 404")
        print("4. Press Enter here when done")
        
        input()
        
        # Save logs
        with open("logs/browser-citation-debug.json", "w") as f:
            json.dump(logs, f, indent=2)
        
        print(f"Captured {len(logs)} events")
        
        # Filter for citation-related events
        citation_events = [
            log for log in logs 
            if any(keyword in str(log).lower() 
                   for keyword in ["citation", "document", "404", "viewer"])
        ]
        
        print(f"\nCitation-related events: {len(citation_events)}")
        for event in citation_events[-10:]:  # Last 10
            print(f"  {event['type']}: {event.get('url', event.get('text', ''))}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture_citation_click())