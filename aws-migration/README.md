# OpenBB AWS Migration Guide

This guide helps you migrate OpenBB from local infrastructure to AWS services for better performance and scalability.

## Architecture Overview

### Before (All Local)
- SQLite databases
- Local Redis
- Local MindsDB
- Local Frontend/Backend

### After (Hybrid AWS)
- **AWS RDS PostgreSQL** - Managed database with better concurrency
- **AWS ElastiCache Redis** - Managed Redis cache
- **Local MindsDB** - Keep local to save costs
- **Local Frontend/Backend** - Development servers

## Cost Estimate (Dev/Demo Stage)
- RDS PostgreSQL (db.t3.micro): ~$15-20/month
- ElastiCache Redis (cache.t3.micro): ~$12-15/month
- **Total**: ~$27-35/month

## Migration Steps

### 1. Prerequisites
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

### 2. Create AWS Resources
```bash
cd /root/openBB/aws-migration
./setup-aws-resources.sh
```

This script will:
- Create security groups for RDS and ElastiCache
- Launch RDS PostgreSQL instance
- Launch ElastiCache Redis cluster
- Configure security rules for your IP

### 3. Wait for Resources
Resources take 5-10 minutes to be available. Check status:
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier openbb-postgres

# Check ElastiCache status
aws elasticache describe-cache-clusters --cache-cluster-id openbb-redis
```

### 4. Update Configuration
Once resources are available, get the endpoints:
```bash
# Get RDS endpoint
aws rds describe-db-instances --db-instance-identifier openbb-postgres \
  --query 'DBInstances[0].Endpoint.Address' --output text

# Get ElastiCache endpoint
aws elasticache describe-cache-clusters --cache-cluster-id openbb-redis \
  --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text
```

Copy `.env.aws` to `.env` and update with actual endpoints:
```bash
cp .env.aws ../.env
# Edit ../.env with the AWS endpoints
```

### 5. Test Connections
```bash
python test-aws-connection.py
```

### 6. Create Database Schema
```bash
# Connect to RDS and create schema
psql -h your-rds-endpoint.region.rds.amazonaws.com -U openbb_admin -d openbb_db -f rds-schema.sql
```

### 7. Migrate Data
```bash
# Run migration script
python migrate-sqlite-to-postgres.py
```

### 8. Update Backend Service
The backend services have been updated to support AWS:
- `cache_service.py` - Now supports AWS ElastiCache
- `aws_db_service.py` - New service for RDS PostgreSQL

### 9. Start Application
```bash
cd /root/openBB
docker-compose -f docker-compose.aws.yml up -d
```

## Verification

1. Check backend health:
```bash
curl http://localhost:8000/api/v1/health
```

2. Check Redis connection:
```bash
curl http://localhost:8000/api/v1/status
```

3. Test private company search:
```bash
curl http://localhost:8000/api/v1/private-companies/search?query=tesla
```

## Troubleshooting

### Connection Issues
1. Verify security group rules allow your IP
2. Check if resources are in "available" state
3. Ensure VPC settings allow public access

### Performance
- RDS: Monitor CPU and connections in AWS Console
- ElastiCache: Check memory usage and evictions

### Rollback
To rollback to local setup:
```bash
docker-compose down
docker-compose up -d  # Uses original local configuration
```

## Next Steps

Once stable in dev:
1. Enable RDS automated backups
2. Set up CloudWatch monitoring
3. Configure ElastiCache parameter groups
4. Consider Multi-AZ for production
5. Implement VPC peering for better security