# Excel Integration in OpenBB Terminal

## Overview
The OpenBB Terminal now includes a fully integrated Excel model viewer and editor, allowing users to upload, edit, and download financial models directly within the terminal interface.

## Features

### 1. Excel File Upload
- Support for `.xlsx`, `.xls`, and `.xlsm` files
- Multiple file upload capability
- File management with upload date and size tracking

### 2. LibreOffice Integration
The system uses two modes:
- **Online Mode**: When LibreOffice Online server is available
- **Local Mode**: Fallback using SheetJS and x-spreadsheet libraries

### 3. Excel Functionality
All standard Excel features are supported:
- Formulas and calculations
- Charts and graphs
- Pivot tables
- VBA macros (in LibreOffice mode)
- Cell formatting
- Multiple worksheets

### 4. Keyboard Shortcuts
- `F2`: Edit cell
- `Ctrl+[`: Trace precedents
- `Ctrl+]`: Trace dependents
- `F5`: Go to cell
- `Ctrl+S`: Save
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo
- `Alt+Tab`: Formula auditing

### 5. Financial Model Templates
Pre-built templates available:
- DCF Valuation Model
- Three Statement Model
- LBO Model
- Comparable Company Analysis
- M&A Model
- Budget & Forecast Model
- Financial Dashboard
- Sensitivity Analysis

## Setup

### Local Development
1. The integration works out of the box with the local fallback mode
2. Files are processed client-side using SheetJS

### Production Setup with LibreOffice Online
1. Install LibreOffice Online or Collabora Online server
2. Set the environment variable:
   ```
   VITE_LIBREOFFICE_URL=https://your-libreoffice-server.com
   ```
3. Configure CORS and authentication as needed

## Usage

1. Navigate to the **Templates** tab in the terminal
2. Either:
   - Click "Upload" to upload your own Excel models
   - Click "Templates" to browse pre-built financial models
3. Select a file to open it in the editor
4. Edit using familiar Excel shortcuts and features
5. Click "Download" to save your changes

## Architecture

### Components
- `TemplatesPage.tsx`: Main page component
- `ExcelModelTemplates.tsx`: Template definitions
- `libreOfficeService.ts`: Service for LibreOffice integration
- `excel-viewer.html`: Local fallback viewer

### Data Flow
1. User uploads file → ArrayBuffer stored in memory
2. File opened → LibreOffice session created or local viewer loaded
3. Edits made → Changes tracked in iframe
4. Download → Modified file retrieved and downloaded

## Security Considerations
- Files are processed locally when possible
- LibreOffice Online connections use secure tokens
- No files are permanently stored on servers
- All editing happens in sandboxed iframes

## Future Enhancements
- Real-time collaboration
- Cloud storage integration
- Advanced formula auditing tools
- Custom financial functions
- API data connections for live updates