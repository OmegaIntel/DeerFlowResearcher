import uuid

# The UUID from our test
test_uuid_str = "10ab9350-9d05-4610-80a9-eb482af5e512"
test_uuid = uuid.UUID(test_uuid_str)

# The hex from the SQL error
sql_hex = "10ab93509d05461080a9eb482af5e512"

print(f"Original UUID string: {test_uuid_str}")
print(f"UUID object: {test_uuid}")
print(f"UUID hex: {test_uuid.hex}")
print(f"SQL parameter hex: {sql_hex}")
print(f"Are they equal: {test_uuid.hex == sql_hex}")
print(f"\nThe issue is that SQLAlchemy is passing UUID as hex without dashes!")

# Let's also check if MySQL expects UUIDs with dashes
print(f"\nUUID formats:")
print(f"With dashes (standard): {test_uuid}")
print(f"Without dashes (hex): {test_uuid.hex}")
print(f"Bytes: {test_uuid.bytes.hex()}")