#!/usr/bin/env python3
"""Debug citation rendering issue"""

import re
import json

def analyze_citation_format(content):
    """Analyze how citations appear in content"""
    print("=== Citation Format Analysis ===\n")
    
    # Check for different citation patterns
    patterns = {
        "Plain citations": r'\[(\d+)\]',
        "Markdown links with /document-viewer": r'\[([^\]]+)\]\(/document-viewer/([^)]+)\)',
        "Markdown links with document-viewer": r'\[([^\]]+)\]\(document-viewer/([^)]+)\)',
        "Any markdown links": r'\[([^\]]+)\]\(([^)]+)\)',
        "Document IDs": r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
    }
    
    for name, pattern in patterns.items():
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            print(f"{name}: Found {len(matches)} matches")
            for i, match in enumerate(matches[:3]):  # Show first 3
                print(f"  {i+1}: {match}")
            if len(matches) > 3:
                print(f"  ... and {len(matches) - 3} more")
        else:
            print(f"{name}: No matches found")
        print()

# Test content that might be causing issues
test_content = """
Here's some content with citations [1] and another [2].
Maybe there's a link like [Document](/document-viewer/96f86d03-d480-48aa-bb42-a7c8bf303730)
Or perhaps [Source](document-viewer/test-id)
"""

analyze_citation_format(test_content)

# Also check if there's a pattern where citation IDs are being replaced
print("\n=== Citation ID Replacement Check ===")
citation_id_pattern = r'\[(\d+)\]'
test_with_ids = "This is citation [1] and [2] and [3]."
print(f"Original: {test_with_ids}")

# Simulate what might be happening
for match in re.finditer(citation_id_pattern, test_with_ids):
    print(f"Found citation: {match.group()} at position {match.start()}-{match.end()}")