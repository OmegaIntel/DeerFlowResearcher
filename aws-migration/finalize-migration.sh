#!/bin/bash

# Finalize AWS Migration Script

echo "=== Finalizing AWS Migration ==="
echo ""

# Source environment variables
if [ -f "../.env.aws" ]; then
    export $(grep -v '^#' ../.env.aws | xargs)
else
    echo "❌ Error: .env.aws file not found!"
    exit 1
fi

# Check ElastiCache status
echo "1. Checking ElastiCache status..."
./check-elasticache-status.sh

# Check if ElastiCache is ready
CACHE_STATUS=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "openbb-redis" \
    --query 'CacheClusters[0].CacheClusterStatus' \
    --output text 2>/dev/null)

if [ "$CACHE_STATUS" != "available" ]; then
    echo ""
    echo "⚠️  ElastiCache is not ready yet (Status: $CACHE_STATUS)"
    echo "Please wait a few more minutes and run this script again."
    exit 1
fi

echo ""
echo "2. Testing RDS MySQL connection..."
./check-rds-connection.sh

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ RDS connection failed. Please fix the connection issues before continuing."
    exit 1
fi

echo ""
echo "3. Running database migration..."
echo "This will migrate your SQLite data to RDS MySQL..."

cd ..
if [ -f "aws-migration/migrate-sqlite-to-mysql.py" ]; then
    python3 aws-migration/migrate-sqlite-to-mysql.py
    if [ $? -ne 0 ]; then
        echo "❌ Database migration failed!"
        exit 1
    fi
else
    echo "⚠️  Migration script not found. Skipping..."
fi

echo ""
echo "4. Creating production .env file..."
cp .env.aws .env

echo ""
echo "5. Summary of AWS Resources:"
echo "================================"
echo "RDS MySQL:"
echo "  Host: $AWS_RDS_HOST"
echo "  Port: $AWS_RDS_PORT"
echo "  Database: $AWS_RDS_DATABASE"
echo ""
echo "ElastiCache Redis:"
echo "  Host: $AWS_REDIS_HOST"
echo "  Port: $AWS_REDIS_PORT"
echo ""
echo "Estimated Monthly Cost:"
echo "  RDS MySQL: Using existing instance (no additional cost)"
echo "  ElastiCache: ~$12-15/month (cache.t3.micro)"
echo "  Total Additional: ~$12-15/month"
echo "================================"

echo ""
echo "✅ AWS Migration Complete!"
echo ""
echo "To start the application with AWS services:"
echo "  docker-compose -f docker-compose.aws.yml up -d"
echo ""
echo "To monitor the application:"
echo "  docker-compose -f docker-compose.aws.yml logs -f"
echo ""
echo "⚠️  Important Security Notes:"
echo "- Keep your .env.aws file secure and never commit it to git"
echo "- Regularly rotate your AWS credentials"
echo "- Monitor your AWS billing dashboard"
echo "- Consider using AWS Secrets Manager for production"