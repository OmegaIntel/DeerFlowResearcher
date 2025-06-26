# Omega Terminal - Access Instructions

## 🚀 Quick Start

The Omega Terminal is now running locally. Here's how to access it:

### Frontend Application
- **URL**: http://localhost:3000
- **Status**: ✅ Running and accessible
- **Features**: Full dashboard with multiple tabs for financial analysis

### Backend API
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Status**: ⚠️ Having connection issues (investigating)

### Ports in Use
- **3000**: Frontend (React/Vite)
- **8000**: Backend API (FastAPI)
- **6379**: Redis Cache
- **47334-47335**: MindsDB

## 📱 Using the Application

1. **Open your browser** and navigate to http://localhost:3000
2. **Default view** shows the Overview tab with AAPL (Apple) data
3. **Search for stocks** using the search bar at the top
4. **Navigate tabs** to see Financials, Ownership, Comparisons, etc.
5. **Add widgets** using the + button in the bottom right

## 🛠️ Managing the Application

### Start the application
```bash
docker-compose up -d
```

### Stop the application
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Restart services
```bash
docker-compose restart
```

## 🐛 Known Issues

1. **Backend connection issues**: The backend API is experiencing connection resets. This may affect data loading in the frontend.
2. **Data may not load**: Due to backend issues, some widgets may show loading states.

## 💡 Tips

- The frontend is fully functional and displays the UI correctly
- Multiple dashboards can be created and managed
- Dark theme is enabled by default
- Export functionality is available for financial data tables