#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}OpenBB Full-Stack Application Startup${NC}"
echo "======================================="

# Check if .env file exists for backend
if [ ! -f "openbb-backend/.env" ]; then
    echo -e "${YELLOW}Warning: Backend .env file not found!${NC}"
    echo "Creating from example..."
    cp openbb-backend/.env.example openbb-backend/.env
    echo -e "${RED}Please add your OpenBB PAT to openbb-backend/.env${NC}"
    echo "Get your PAT from: https://hub.openbb.co"
    exit 1
fi

# Check if OpenBB PAT is set
if ! grep -q "OPENBB_PAT=.*[a-zA-Z0-9]" openbb-backend/.env; then
    echo -e "${RED}Error: OpenBB PAT not set in openbb-backend/.env${NC}"
    echo "Please add your OpenBB Personal Access Token"
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
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
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "To view logs: make logs"
echo "To stop: make stop"