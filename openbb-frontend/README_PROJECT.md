# OpenBB Frontend Replica

This is a React + TypeScript implementation of the OpenBB financial dashboard interface.

## Features

- **Dashboard Layout**: Sidebar navigation with collapsible menu
- **Ticker Information**: Real-time stock price display with change indicators
- **Company Profile**: Detailed company information including sector, industry, and description
- **Price Performance**: Performance metrics across different time periods
- **Company News**: News feed with related tickers and sentiment indicators
- **Key Metrics**: Important financial metrics and statistics
- **Share Statistics**: Float and outstanding share information
- **Management Team**: Executive team information with compensation data
- **Revenue Charts**: Interactive charts for revenue by geography and business lines
- **OpenBB Copilot**: AI-powered chat interface for financial analysis

## Tech Stack

- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- React Router for navigation
- React Query for data fetching and caching
- Chart.js for data visualization
- Lucide React for icons

## Getting Started

### Prerequisites

- Node.js 18+ (Note: There are warnings about Node 20+ requirement from react-router, but it works with Node 18)
- npm 9+

### Installation

1. Navigate to the frontend directory:
```bash
cd openbb-frontend
```

2. Install dependencies:
```bash
npm install
```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Building for Production

Build the project:
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── copilot/       # AI chat interface
│   ├── dashboard/     # Dashboard components (ticker info, charts, etc.)
│   └── layout/        # Layout components (sidebar, main content)
├── hooks/             # Custom React hooks for data fetching
├── services/          # Mock data service
├── types/             # TypeScript type definitions
├── utils/             # Utility functions and configurations
├── App.tsx            # Main application component
├── index.css          # Global styles with Tailwind
└── main.tsx           # Application entry point
```

## Mock Data

The application currently uses mock data for development. The mock data service includes:
- Stock information for AAPL and MSFT
- Company profiles
- News items
- Management team data
- Revenue data by geography and business lines
- Key metrics and share statistics

To connect to a real API, update the functions in `src/services/mockData.ts` to make actual API calls.

## Customization

### Adding New Tickers

To add support for more tickers, update the mock data in `src/services/mockData.ts`:

1. Add new entries to `mockStockData`
2. Add corresponding company profiles to `mockCompanyProfile`
3. Add management, metrics, and other relevant data

### Styling

The application uses Tailwind CSS with custom colors defined for the OpenBB brand:
- Primary: `#003D5B`
- Secondary: `#8B9DC3`
- Accent: `#4A90E2`

Update these in `tailwind.config.js` to match your brand colors.

## Future Enhancements

- Real-time data integration with financial APIs
- WebSocket support for live price updates
- Advanced charting capabilities
- Portfolio management features
- User authentication and preferences
- Mobile responsive design improvements
- Dark mode support
- Export functionality for reports