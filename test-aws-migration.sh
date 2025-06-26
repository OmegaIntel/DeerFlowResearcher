#!/bin/bash

# Test AWS Migration Script
# This script tests the application after AWS migration

echo "==================================="
echo "   OpenBB AWS Migration Test"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if .env.aws exists with real credentials
if [ ! -f ".env.aws" ]; then
    echo -e "${RED}[ERROR]${NC} .env.aws file not found!"
    echo ""
    echo "Please create .env.aws with your AWS credentials first."
    exit 1
fi

# Check if credentials are configured
if grep -q "your-.*-here" .env.aws; then
    echo -e "${RED}[ERROR]${NC} .env.aws contains placeholder values!"
    echo ""
    echo "Please update .env.aws with your actual AWS credentials:"
    echo "  - AWS_ACCESS_KEY_ID"
    echo "  - AWS_SECRET_ACCESS_KEY"
    echo "  - AWS_RDS_USERNAME"
    echo "  - AWS_RDS_PASSWORD"
    echo "  - API keys for various services"
    echo ""
    echo "Edit the file: nano .env.aws"
    exit 1
fi

# Test with local setup first
echo "1. Testing with local setup (SQLite + Redis)"
echo "==========================================="

# Stop any running containers
docker-compose down 2>/dev/null || true
docker-compose -f docker-compose.aws.yml down 2>/dev/null || true

# Start local setup
echo -e "${YELLOW}Starting local setup...${NC}"
docker-compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 15

# Test local backend
echo -n "Testing local backend... "
LOCAL_BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs 2>/dev/null || echo "000")
if [ "$LOCAL_BACKEND" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed (HTTP $LOCAL_BACKEND)${NC}"
    echo "Checking logs..."
    docker-compose logs backend | tail -20
fi

# Test local frontend
echo -n "Testing local frontend... "
LOCAL_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$LOCAL_FRONTEND" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed (HTTP $LOCAL_FRONTEND)${NC}"
fi

# Show running containers
echo ""
echo "Local containers status:"
docker-compose ps

# Stop local setup
echo ""
read -p "Local setup tested. Ready to test AWS setup? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

docker-compose down

# Test with AWS setup
echo ""
echo "2. Testing with AWS setup (RDS MySQL + ElastiCache)"
echo "=================================================="

# Copy .env.aws to .env
cp .env.aws .env

# Start AWS setup
echo -e "${YELLOW}Starting AWS setup...${NC}"
docker-compose -f docker-compose.aws.yml up -d

# Wait for services
echo "Waiting for services to start..."
sleep 15

# Test AWS backend
echo -n "Testing AWS backend... "
AWS_BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs 2>/dev/null || echo "000")
if [ "$AWS_BACKEND" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed (HTTP $AWS_BACKEND)${NC}"
    echo "Checking logs..."
    docker-compose -f docker-compose.aws.yml logs backend | tail -20
fi

# Test AWS frontend
echo -n "Testing AWS frontend... "
AWS_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$AWS_FRONTEND" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed (HTTP $AWS_FRONTEND)${NC}"
fi

# Test specific endpoints
echo ""
echo "3. Testing API Endpoints"
echo "========================"

# Health check
echo -n "Health endpoint: "
HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "error")
if [ "$HEALTH" == "healthy" ] || [ "$HEALTH" == "ok" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
fi

# Test providers endpoint
echo -n "Providers endpoint: "
PROVIDERS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/providers 2>/dev/null || echo "000")
if [ "$PROVIDERS" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed (HTTP $PROVIDERS)${NC}"
fi

# Show running containers
echo ""
echo "AWS containers status:"
docker-compose -f docker-compose.aws.yml ps

# Show logs
echo ""
echo "Recent backend logs:"
docker-compose -f docker-compose.aws.yml logs --tail=10 backend

echo ""
echo "==================================="
echo "   Test Summary"
echo "==================================="
echo ""
if [ "$AWS_BACKEND" == "200" ] && [ "$AWS_FRONTEND" == "200" ]; then
    echo -e "${GREEN}✅ AWS migration successful!${NC}"
    echo ""
    echo "Application is running with:"
    echo "  - Database: AWS RDS MySQL"
    echo "  - Cache: AWS ElastiCache Redis"
    echo "  - Backend: http://localhost:8000"
    echo "  - Frontend: http://localhost:3000"
    echo "  - API Docs: http://localhost:8000/docs"
else
    echo -e "${RED}❌ AWS migration needs attention${NC}"
    echo ""
    echo "Please check:"
    echo "1. AWS credentials in .env.aws"
    echo "2. RDS security group allows your IP"
    echo "3. ElastiCache is available"
    echo "4. Container logs for errors"
fi

echo ""
echo "To view live logs:"
echo "  docker-compose -f docker-compose.aws.yml logs -f"