#!/usr/bin/env python3
"""
Test script to verify the upload dialog overflow fix
"""

import time
import requests
from pathlib import Path

# Create test files with various filename lengths
test_files = [
    "short.txt",
    "medium_length_filename.txt", 
    "this_is_a_very_long_filename_that_should_definitely_overflow_and_be_truncated_properly_in_the_upload_dialog_component.txt",
    "super_extremely_long_filename_with_many_words_and_underscores_that_will_test_the_limits_of_the_truncation_functionality_in_the_upload_dialog_component_and_make_sure_it_works_properly.txt"
]

print("Creating test files...")
for filename in test_files:
    filepath = Path(f"/root/deer-flow/{filename}")
    filepath.write_text(f"Test content for {filename}")
    print(f"Created: {filename}")

print("\nTest files created. Please:")
print("1. Navigate to http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/documents")
print("2. Click the upload button")
print("3. Try uploading these test files:")
for f in test_files:
    print(f"   - {f}")
print("\n4. Verify that long filenames are properly truncated with ellipsis")
print("5. Verify that the layout doesn't break or overflow horizontally")
print("\nThe fix applied:")
print("- Added 'min-w-0' to the flex container to allow proper width constraints")
print("- Wrapped icons and buttons in 'flex-shrink-0' divs to prevent them from shrinking")
print("- Added 'block' to the truncate class for proper text truncation")
print("- Added padding-right to the ScrollArea content to account for scrollbar")