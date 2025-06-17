# Repository Cleanup Summary

This document summarizes the test and debug files that were moved to the tests directory during cleanup.

## Files Moved to tests/

### Python Test Files
- All `check_*.py` files (check_documents_page.py, check_pinecone_indexes.py, etc.)
- All `test_*.py` files (test_chat_ui_simple.py, test_ui_browser_final.py, etc.)
- All `create_test_*.py` files

### HTML Test Files (moved to tests/html/)
- create-test-session.html
- direct-test.html
- test-auth.html
- test-chat-history-direct.html
- test-chat-history.html
- test-dynamic-api.html
- test-register.html

### Test Data Files (moved to tests/test_files/)
- backend_cookies.txt
- cookies.txt
- medium_length_filename.txt
- short.txt
- Long filename test files for upload dialog testing

### Debug Files (moved to tests/debug/)
- capture_screenshots.py
- debug_api.html
- documents-fix.css
- documents_page.html

### Other Test Files
- test_documents_page.js
- test_output.log
- test-overflow.html
- test-upload-dialog.py

## Directory Structure After Cleanup

```
tests/
├── html/          # HTML test files
├── test_files/    # Test data files
├── debug/         # Debug and development files
├── integration/   # Integration tests (already existed)
└── [all other test files]
```

## Files NOT Moved

The following files were kept in their original locations:
- README files (all properly organized in their respective directories)
- MCP server test files (kept in mcp-servers/*/test_server.py)
- Production configuration files
- Docker and deployment files