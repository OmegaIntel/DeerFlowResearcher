#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}OpenBB Full-Stack Application Startup (Development Mode)${NC}"
echo "======================================="

# Check if .env file exists for backend
if [ ! -f "openbb-backend/.env" ]; then
    echo -e "${YELLOW}Creating .env file from example...${NC}"
    cp openbb-backend/.env.example openbb-backend/.env
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

# Check OpenBB PAT status
if grep -q "OPENBB_PAT=your_openbb_personal_access_token_here" openbb-backend/.env || ! grep -q "OPENBB_PAT=.*[a-zA-Z0-9]" openbb-backend/.env; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}OpenBB PAT not configured${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${BLUE}The application will run with MOCK DATA${NC}"
    echo ""
    echo "To use real financial data:"
    echo "1. Get your PAT from: https://my.openbb.co/app/platform/pat"
    echo "2. Add it to openbb-backend/.env"
    echo ""
    echo -e "${GREEN}Starting with mock data...${NC}"
fi

# Start services
echo -e "${GREEN}Starting services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check service health
echo -e "${GREEN}Checking service status...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}Services started successfully!${NC}"
echo "======================================="
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}Backend API:${NC} http://localhost:8000"
echo -e "${BLUE}API Docs:${NC} http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}Data Mode:${NC} $(grep -q "OPENBB_PAT=your_openbb_personal_access_token_here" openbb-backend/.env && echo "MOCK DATA" || echo "REAL DATA (if PAT is valid)")"
echo ""
echo "To view logs: make logs"
echo "To stop: make stop"