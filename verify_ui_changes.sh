#!/bin/bash

echo "Checking UI changes in chat-history page..."
echo "=========================================="

# Check if container is running
if docker ps | grep -q deer-flow-frontend; then
    echo "✓ Frontend container is running"
else
    echo "✗ Frontend container is not running"
    exit 1
fi

# Check the actual file in the container
echo -e "\nChecking main.tsx in container volumes..."
if grep -q 'size="icon"' /root/deer-flow/web/src/app/chat-history/main.tsx; then
    echo "✓ Icon buttons found in source file"
else
    echo "✗ Icon buttons NOT found in source file"
fi

if grep -q 'handleDeleteAllSessions' /root/deer-flow/web/src/app/chat-history/main.tsx; then
    echo "✓ Delete all function found in source file"
else
    echo "✗ Delete all function NOT found in source file"
fi

# Check if the console log is present
if grep -q 'Component rendered with new UI changes' /root/deer-flow/web/src/app/chat-history/main.tsx; then
    echo "✓ Console log found in source file"
else
    echo "✗ Console log NOT found in source file"
fi

echo -e "\nFile modification time:"
ls -la /root/deer-flow/web/src/app/chat-history/main.tsx | awk '{print $6, $7, $8}'

echo -e "\nLast 5 lines with Button from the file:"
grep -n "Button" /root/deer-flow/web/src/app/chat-history/main.tsx | tail -5