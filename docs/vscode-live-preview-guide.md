# VS Code Live Preview Extension Guide

## Finding Live Preview in VS Code

### 1. Check Activity Bar
Look for the Live Preview icon in the Activity Bar (left sidebar):
- It looks like a browser/preview icon
- Usually appears after Explorer, Search, Source Control, etc.

### 2. If Not Visible in Activity Bar
1. **Right-click on the Activity Bar** (the vertical bar with icons)
2. You'll see a list of available views
3. Check if "Live Preview" is listed and ensure it's checked

### 3. Alternative Ways to Access

#### Command Palette Method:
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Live Preview"
3. Select "Live Preview: Show Preview (External Browser)" or "Show Preview (Internal Browser)"

#### Right-Click Method:
1. Open any HTML file (like our test files)
2. Right-click in the editor
3. Look for "Show Preview" option

### 4. Using Live Preview

For our voice test files:
1. Open `/root/deer-flow/test-voice-render.html`
2. Right-click in the editor
3. Select "Show Preview"

Or for the React app:
1. The app is already running on http://localhost:3000
2. You can use Live Preview's external browser option
3. Or just open http://localhost:3000 in your regular browser

### 5. If Extension Not Installed

Check if it's installed:
1. Click Extensions icon (or Ctrl+Shift+X)
2. Search for "Live Preview"
3. Look for "Live Preview" by Microsoft
4. Click Install if not already installed

### 6. VS Code Browser Preview Alternative

If Live Preview isn't working, you can also use:
- **Browser Preview** extension
- **Preview on Web Server** extension
- Or simply use your regular browser with http://localhost:3000

## For Our Voice Testing

Since our app is running in Docker on port 3000, you can:
1. Open your regular browser (Chrome/Edge recommended)
2. Navigate to:
   - http://localhost:3000/voice-basic-test
   - http://localhost:3000/voice-inline-test
   - http://localhost:3000/chat

The Live Preview extension is more useful for static HTML files. For our React app, using your regular browser is actually better for testing voice features.