#!/bin/bash

echo "=== Checking for citation patterns in message content ==="

# Check database for message content with citations
docker exec deer-flow-mysql mysql -uroot -prootpassword -e "
SELECT id, SUBSTRING(content, 1, 500) as content_preview 
FROM deer_flow.chat_messages 
WHERE content LIKE '%[%]%' 
AND role = 'assistant'
ORDER BY created_at DESC 
LIMIT 5;
" 2>&1 | grep -v Warning

echo -e "\n=== Checking backend logs for citation processing ==="
docker logs deer-flow-backend --tail 200 2>&1 | grep -E "LLM response|citation|document-viewer" | tail -20