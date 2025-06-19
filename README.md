# OpenBB Full-Stack Application

A full-stack financial analysis platform integrating OpenBB SDK for real-time market data.

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + OpenBB SDK
- **Cache**: Redis
- **Deployment**: Docker Compose

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)
- OpenBB Personal Access Token (PAT) - **Optional** (app will use mock data without it)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd openBB
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp openbb-backend/.env.example openbb-backend/.env
   # Add your OpenBB PAT to the .env file
   
   # Frontend (optional, defaults to localhost)
   cp openbb-frontend/.env.example openbb-frontend/.env
   ```

3. **Start the application**
   ```bash
   make start-dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Data Sources

The application supports multiple data sources:

### 1. Yahoo Finance (Default - No API Key Required)
- Real-time stock prices
- Company information
- News and analyst ratings
- Basic financial data

### 2. Free API Providers (Recommended)
- **Alpha Vantage** - 500 requests/day free
- **Polygon.io** - Real-time data with free tier
- **Financial Modeling Prep** - Detailed financials
- See [API Setup Guide](API_SETUP_GUIDE.md) for details

### 3. OpenBB Hub (Optional)
- Unified access to 100+ data providers
- Requires PAT from [OpenBB Hub](https://my.openbb.co/app/platform/pat)
- Best for production use

### 4. Mock Data (Fallback)
- Realistic sample data
- Always available
- Perfect for development/testing

## Available Endpoints

### Equity Data
- `GET /api/v1/equity/price/historical` - Historical price data
- `GET /api/v1/equity/fundamental/overview` - Company overview
- `GET /api/v1/equity/ownership/share-statistics` - Share statistics
- `GET /api/v1/equity/fundamental/management` - Management team
- `GET /api/v1/equity/fundamental/revenue-geography` - Revenue by geography
- `GET /api/v1/equity/fundamental/revenue-segment` - Revenue by segment
- `GET /api/v1/equity/fundamental/metrics` - Valuation metrics
- `GET /api/v1/equity/fundamental/filings` - Company filings
- `GET /api/v1/equity/estimates/price-target` - Analyst price targets

### News
- `GET /api/v1/news/company` - Company news

### ETF
- `GET /api/v1/etf/info` - ETF information

## Development

### Local Development (without Docker)

1. **Backend**
   ```bash
   cd openbb-backend
   pip install -r requirements.txt
   uvicorn api.main:app --reload
   ```

2. **Frontend**
   ```bash
   cd openbb-frontend
   npm install
   npm run dev
   ```

### Running Tests

```bash
# All tests
make test

# Frontend tests only
cd openbb-frontend && npm test

# Backend tests only
cd openbb-backend && pytest
```

### Useful Commands

```bash
# View logs
make logs

# View backend logs only
make logs-backend

# View frontend logs only
make logs-frontend

# Restart services
make restart

# Stop services
make stop

# Clean up everything
make clean
```

## Production Deployment

1. **Build production images**
   ```bash
   make build
   ```

2. **Start production environment**
   ```bash
   make start-prod
   ```

## Troubleshooting

### Redis Connection Failed
- Ensure Redis is running: `docker ps | grep redis`
- Check Redis logs: `docker-compose logs redis`

### OpenBB API Errors
- Verify your PAT is correct in `.env`
- Check backend logs: `make logs-backend`

### Frontend Can't Connect to Backend
- Ensure backend is running: `docker ps | grep backend`
- Check CORS settings in backend
- Verify `VITE_API_URL` in frontend `.env`

## Widget Development

To add a new widget:

1. Create widget component in `openbb-frontend/src/components/dashboard/`
2. Add OpenBB data hook in `openbb-frontend/src/hooks/useOpenBBData.ts`
3. Register widget in `DynamicWidget.tsx`
4. Add backend endpoint if needed in `openbb-backend/api/v1/endpoints/`

## License

This project integrates with OpenBB SDK which is licensed under AGPLv3.