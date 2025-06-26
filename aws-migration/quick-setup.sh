#!/bin/bash

# Quick AWS Migration Setup Script
# This script helps set up AWS credentials and runs the migration

set -e  # Exit on error

echo "==================================="
echo "   OpenBB AWS Migration Setup"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running from correct directory
if [ ! -f "setup-aws-credentials.sh" ]; then
    print_error "Please run this script from the aws-migration directory"
    exit 1
fi

# Step 1: Setup AWS Credentials
echo ""
echo "Step 1: Setting up AWS Credentials"
echo "=================================="
echo ""
echo "You will need:"
echo "  - AWS Access Key ID"
echo "  - AWS Secret Access Key" 
echo "  - RDS MySQL credentials"
echo ""
read -p "Do you have these credentials ready? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Please gather your AWS credentials first."
    echo ""
    echo "To create AWS access keys:"
    echo "1. Go to AWS Console > IAM > Users"
    echo "2. Select your user > Security credentials"
    echo "3. Create access key"
    echo ""
    echo "For RDS credentials, check your existing RDS instance settings."
    exit 1
fi

# Run the setup script
print_status "Running AWS credentials setup..."
./setup-aws-credentials.sh

if [ $? -ne 0 ]; then
    print_error "Failed to set up AWS credentials"
    exit 1
fi

# Step 2: Test RDS Connection
echo ""
echo "Step 2: Testing RDS MySQL Connection"
echo "===================================="
print_status "Checking RDS connectivity..."
./check-rds-connection.sh

if [ $? -ne 0 ]; then
    print_error "RDS connection failed!"
    echo ""
    echo "Common fixes:"
    echo "1. Check your RDS credentials"
    echo "2. Ensure RDS security group allows your IP"
    echo "3. Make sure RDS instance is running"
    echo ""
    echo "Your current IP: $(curl -s ifconfig.me)"
    exit 1
fi

print_status "RDS connection successful!"

# Step 3: Setup ElastiCache
echo ""
echo "Step 3: Setting up ElastiCache Redis"
echo "===================================="
print_status "Creating ElastiCache cluster..."
./setup-elasticache.sh

if [ $? -ne 0 ]; then
    print_error "Failed to create ElastiCache cluster"
    exit 1
fi

# Step 4: Wait for ElastiCache
echo ""
echo "Step 4: Waiting for ElastiCache to be ready"
echo "==========================================="
echo "This typically takes 5-10 minutes..."
echo ""

# Check status every 30 seconds
MAX_ATTEMPTS=20
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo -n "Checking status (attempt $ATTEMPT/$MAX_ATTEMPTS)... "
    
    STATUS=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id "openbb-redis" \
        --query 'CacheClusters[0].CacheClusterStatus' \
        --output text 2>/dev/null || echo "not-found")
    
    if [ "$STATUS" == "available" ]; then
        echo -e "${GREEN}Ready!${NC}"
        print_status "ElastiCache is available!"
        break
    elif [ "$STATUS" == "creating" ]; then
        echo -e "${YELLOW}Still creating...${NC}"
        sleep 30
    else
        echo -e "${RED}Status: $STATUS${NC}"
        if [ "$STATUS" == "not-found" ]; then
            print_error "ElastiCache cluster not found"
            exit 1
        fi
        sleep 30
    fi
done

if [ "$STATUS" != "available" ]; then
    print_error "ElastiCache did not become available in time"
    echo "Current status: $STATUS"
    echo "You can run ./check-elasticache-status.sh later to check again"
    exit 1
fi

# Update ElastiCache endpoint
print_status "Updating ElastiCache endpoint..."
./check-elasticache-status.sh

# Step 5: Run Migration
echo ""
echo "Step 5: Migrating Data to AWS"
echo "=============================="
print_status "Running database migration..."
cd ..
python3 aws-migration/migrate-sqlite-to-mysql.py

if [ $? -ne 0 ]; then
    print_error "Database migration failed"
    exit 1
fi

print_status "Database migration completed!"

# Step 6: Create production .env
print_status "Creating production environment file..."
cp .env.aws .env

# Step 7: Start Application
echo ""
echo "Step 6: Starting Application with AWS Services"
echo "=============================================="

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start with AWS configuration
print_status "Starting application with AWS services..."
docker-compose -f docker-compose.aws.yml up -d

# Wait for services to start
echo ""
echo "Waiting for services to start..."
sleep 10

# Check if services are running
print_status "Checking service status..."
docker-compose -f docker-compose.aws.yml ps

# Step 8: Test Application
echo ""
echo "Step 7: Testing Application"
echo "==========================="

# Test backend
echo -n "Testing backend API... "
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed (HTTP $BACKEND_STATUS)${NC}"
fi

# Test frontend
echo -n "Testing frontend... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" == "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed (HTTP $FRONTEND_STATUS)${NC}"
fi

# Summary
echo ""
echo "==================================="
echo "   Migration Summary"
echo "==================================="
echo ""
print_status "AWS Resources Created:"
echo "  - RDS MySQL: omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com"
echo "  - ElastiCache Redis: $(grep AWS_REDIS_HOST .env.aws | cut -d= -f2)"
echo ""
print_status "Application Status:"
echo "  - Backend: http://localhost:8000"
echo "  - Frontend: http://localhost:3000"
echo ""
print_status "Monthly Cost Estimate:"
echo "  - ElastiCache: ~$12-15/month"
echo "  - RDS: Using existing instance"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.aws.yml logs -f"
echo ""
echo -e "${GREEN}✅ AWS Migration Complete!${NC}"