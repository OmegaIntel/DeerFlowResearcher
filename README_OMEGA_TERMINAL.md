# 🌟 Omega Terminal - Professional Financial Dashboard

A comprehensive financial analysis platform with real-time market data, advanced analytics, and AI-powered insights.

## 🌐 Access Information

### Live Application URL
**http://ec2-100-26-54-124.compute-1.amazonaws.com**

✅ **Yes, you are accessing the correct URL!** The application is running on AWS EC2 and is publicly accessible.

## 🚀 Features Overview

### 📊 1. Multi-Tab Dashboard Interface
The application provides comprehensive financial analysis through multiple specialized tabs:

#### **Overview Tab**
- **Ticker Information**: Real-time price, volume, market cap
- **Company Profile**: Business description, sector, industry
- **Key Metrics**: P/E ratio, EPS, dividend yield, beta
- **Share Statistics**: Float, shares outstanding, institutional ownership
- **Management Team**: Executive profiles and compensation
- **Company News**: Latest news aggregated from multiple sources

#### **Financials Tab**
- **Income Statement**: Revenue, gross profit, operating income, net income
- **Balance Sheet**: Assets, liabilities, shareholder equity
- **Cash Flow Statement**: Operating, investing, financing activities
- **Multi-year comparison** (up to 10 years)
- **Export to Excel** functionality

#### **Technical Analysis Tab**
- Price charts with multiple timeframes
- Technical indicators
- Volume analysis
- Trading patterns

#### **Comparison Analysis Tab**
- Side-by-side stock comparison
- Relative performance metrics
- Peer analysis

#### **Ownership Tab**
- Institutional holdings
- Insider transactions
- Major shareholders
- Ownership trends

#### **Additional Tabs**
- **Company Calendar**: Earnings dates, dividends, events
- **Estimates**: Analyst consensus and price targets
- **Templates**: Excel integration and financial models

### 🤖 2. AI Copilot Assistant
- Natural language queries about financial data
- Context-aware responses based on displayed widgets
- Smart insights and recommendations
- Mock mode available (no OpenAI key required)

### 🔄 3. Real-Time Data Integration
The platform aggregates data from multiple providers:
- **Alpha Vantage**: Market data and fundamentals
- **Polygon.io**: Real-time quotes and news
- **Financial Modeling Prep**: Detailed financials
- **Benzinga**: News and analyst ratings
- **API Ninjas**: Earnings call transcripts
- **Yahoo Finance**: Fallback data source

### 🎨 4. Interactive Features
- **Dynamic Widget Management**: Add/remove widgets on any page
- **Drag-and-Drop Layout**: Customize your dashboard
- **Ticker Search**: Quick symbol lookup with autocomplete
- **Dark Theme**: Professional dark-themed interface
- **Responsive Design**: Works on desktop and tablet
- **Data Export**: Export any data table to Excel/CSV

## 🏗️ Technical Architecture

### Docker Container Setup
```
┌─────────────────────────────────────────────┐
│           Nginx (Port 80)                   │
│         Reverse Proxy & Load Balancer       │
└─────────────┬───────────────┬───────────────┘
              │               │
    ┌─────────▼─────┐   ┌────▼──────────┐
    │   Frontend    │   │    Backend     │
    │  React/Vite   │   │ FastAPI/Python │
    │  (Port 3000)  │   │  (Port 8000)   │
    └───────────────┘   └────┬──────────┘
                             │
                    ┌────────▼────────┐
                    │     Redis        │
                    │ Caching Layer    │
                    │  (Port 6379)     │
                    └─────────────────┘
```

## 📱 How to Use the Application

### 1. Initial Access
1. Navigate to http://ec2-100-26-54-124.compute-1.amazonaws.com
2. The application loads with Apple (AAPL) as the default ticker
3. All tabs and features are immediately available

### 2. Changing Stocks
1. Click on the ticker selector (shows current symbol, e.g., "AAPL")
2. Type to search for any stock symbol
3. Select from the dropdown or press Enter
4. All widgets update automatically

### 3. Managing Your Dashboard
1. **Add Widgets**: Click the blue "+" button in the bottom right
2. **Remove Widgets**: Click the "X" on any widget header
3. **Rearrange**: Drag widgets by their headers
4. **Resize**: Drag widget edges (on supported widgets)

### 4. Using the AI Copilot
1. Click the chat icon in the top right
2. Ask questions like:
   - "What's Apple's revenue growth?"
   - "Compare AAPL and MSFT margins"
   - "Explain the latest earnings"
3. The AI analyzes visible widget data for context

### 5. Exporting Data
1. Look for export icons on data tables
2. Choose format (Excel or CSV)
3. File downloads automatically

## 🧪 Test Results Summary

### Current Status
- ✅ **Frontend**: Loading successfully
- ✅ **UI Components**: Rendering correctly
- ✅ **Navigation**: Tab switching works
- ⚠️ **API Routes**: Some endpoints need fixing
- ✅ **Docker Containers**: All running properly

### What's Working
1. Main application interface
2. Tab navigation
3. Financial data display
4. Widget system
5. Dark theme
6. Basic copilot functionality

### Known Issues
1. Some API endpoints return 404 (being fixed)
2. Ticker selector styling needs adjustment
3. Some widgets may show loading states

## 🔧 Technical Details

### Container Status
```bash
# Check running containers
docker ps

# Current containers:
- openbb-nginx-1 (Port 80)
- openbb-frontend-1 (Port 3000)
- openbb-backend-1 (Port 8000)
- openbb-redis-1 (Port 6379)
- openbb-onlyoffice-1 (Document server)
```

### API Endpoints
Base URL: `http://ec2-100-26-54-124.compute-1.amazonaws.com/api`

Working endpoints:
- GET `/` - API root
- GET `/health` - Health check
- GET `/v1/equity/*` - Equity data endpoints
- GET `/v1/news/*` - News endpoints
- POST `/v1/copilot/session` - Copilot sessions

### Environment Variables
The application uses these environment variables:
- `OPENBB_PAT` - OpenBB Platform token (optional)
- `ALPHA_VANTAGE_API_KEY` - Alpha Vantage key
- `POLYGON_API_KEY` - Polygon.io key
- `FMP_API_KEY` - Financial Modeling Prep key
- `BENZINGA_API_KEY` - Benzinga key
- `API_NINJAS_KEY` - API Ninjas key (configured)
- `OPENAI_API_KEY` - OpenAI key (optional)

## 🛠️ Maintenance Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop application
docker-compose -f docker-compose.prod.yml down

# Start application
docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Support & Troubleshooting

### If the page doesn't load:
1. Refresh the browser (Ctrl+F5)
2. Clear browser cache
3. Try incognito/private mode
4. Check if URL is exactly: http://ec2-100-26-54-124.compute-1.amazonaws.com

### If data doesn't appear:
1. Some widgets may take a moment to load
2. Free API tiers have rate limits
3. Switch to a different stock and back

### For developers:
- API Documentation: http://ec2-100-26-54-124.compute-1.amazonaws.com/api/docs
- Frontend runs on React 19 with Vite
- Backend uses FastAPI with Python 3.11
- All code is in `/root/openBB/`

## 🎯 Quick Start Guide

1. **Open the app**: http://ec2-100-26-54-124.compute-1.amazonaws.com
2. **Search for a stock**: Use the ticker selector
3. **Explore tabs**: Click through Overview, Financials, etc.
4. **Add widgets**: Click the "+" button
5. **Ask questions**: Use the AI Copilot
6. **Export data**: Use export buttons on tables

---

**Note**: This is a demonstration application. Some features may be limited by free API tiers. For production use, configure your own API keys in the environment variables.