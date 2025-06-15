#!/bin/bash

echo "Searching for document-viewer references..."

# Search in all source files
echo -e "\n=== In Python files ==="
grep -r "document-viewer" /root/deer-flow/src --include="*.py" | grep -v __pycache__ || echo "None found"

echo -e "\n=== In TypeScript/JavaScript files ==="
grep -r "document-viewer" /root/deer-flow/web/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v node_modules || echo "None found"

echo -e "\n=== In HTML files ==="
grep -r "document-viewer" /root/deer-flow --include="*.html" | grep -v node_modules || echo "None found"

echo -e "\n=== Checking for patterns that might create these links ==="
echo "Looking for citation replacement patterns..."
grep -r "\[.*\].*=.*document" /root/deer-flow/src --include="*.py" | grep -v __pycache__ || echo "None found"

echo -e "\n=== Checking database for existing messages with document-viewer links ==="
docker exec deer-flow-mysql mysql -uroot -prootpassword -e "SELECT id, SUBSTRING(content, 1, 200) as content_preview FROM deer_flow.chat_messages WHERE content LIKE '%document-viewer%';" 2>&1 | grep -v Warning || echo "None found"

echo -e "\n=== Recent backend logs mentioning document-viewer ==="
docker logs deer-flow-backend 2>&1 | grep -i "document-viewer" | tail -10 || echo "None found"