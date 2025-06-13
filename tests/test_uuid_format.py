import uuid

# Test UUID formatting
test_uuid = "6b100139-c961-4417-ae75-072557698372"
print(f"Original: {test_uuid}")

# Parse and reformat
parsed = uuid.UUID(test_uuid)
print(f"Parsed: {parsed}")
print(f"String: {str(parsed)}")
print(f"Hex: {parsed.hex}")

# Check if they're equal
print(f"Equal: {test_uuid == str(parsed)}")

# Test without dashes
no_dashes = "6b100139c9614417ae75072557698372"
parsed2 = uuid.UUID(no_dashes)
print(f"\nNo dashes: {no_dashes}")
print(f"Parsed: {parsed2}")
print(f"String: {str(parsed2)}")
print(f"Are they the same UUID: {parsed == parsed2}")