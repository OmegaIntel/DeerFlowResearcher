#!/bin/bash
# Script to set up AWS resources for OpenBB

echo "Setting up AWS resources for OpenBB..."
echo "Please ensure you have AWS CLI configured with appropriate credentials"
echo ""

# Get AWS region from user
read -p "Enter AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

# Create VPC Security Group for RDS
echo "Creating RDS security group..."
RDS_SG_ID=$(aws ec2 create-security-group \
    --group-name openbb-rds-sg \
    --description "Security group for OpenBB RDS PostgreSQL" \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "RDS Security Group created: $RDS_SG_ID"
    
    # Allow PostgreSQL access from your IP
    MY_IP=$(curl -s https://checkip.amazonaws.com)
    aws ec2 authorize-security-group-ingress \
        --group-id $RDS_SG_ID \
        --protocol tcp \
        --port 5432 \
        --cidr ${MY_IP}/32 \
        --region $AWS_REGION
    echo "Added PostgreSQL access rule for IP: $MY_IP"
else
    echo "Security group might already exist. Fetching existing..."
    RDS_SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=openbb-rds-sg" \
        --region $AWS_REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
fi

# Create Security Group for ElastiCache
echo ""
echo "Creating ElastiCache security group..."
CACHE_SG_ID=$(aws ec2 create-security-group \
    --group-name openbb-elasticache-sg \
    --description "Security group for OpenBB ElastiCache Redis" \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "ElastiCache Security Group created: $CACHE_SG_ID"
    
    # Allow Redis access from your IP
    aws ec2 authorize-security-group-ingress \
        --group-id $CACHE_SG_ID \
        --protocol tcp \
        --port 6379 \
        --cidr ${MY_IP}/32 \
        --region $AWS_REGION
    echo "Added Redis access rule for IP: $MY_IP"
else
    echo "Security group might already exist. Fetching existing..."
    CACHE_SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=openbb-elasticache-sg" \
        --region $AWS_REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
fi

# Create RDS PostgreSQL instance
echo ""
echo "Creating RDS PostgreSQL instance..."
echo "This will create a db.t3.micro instance (eligible for free tier)"
read -p "Enter database password (min 8 chars): " -s DB_PASSWORD
echo ""

aws rds create-db-instance \
    --db-instance-identifier openbb-postgres \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username openbb_admin \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --vpc-security-group-ids $RDS_SG_ID \
    --backup-retention-period 7 \
    --no-multi-az \
    --publicly-accessible \
    --storage-type gp2 \
    --region $AWS_REGION

if [ $? -eq 0 ]; then
    echo "RDS instance creation initiated. It will take 5-10 minutes to be available."
else
    echo "RDS instance might already exist or creation failed."
fi

# Create ElastiCache Redis cluster
echo ""
echo "Creating ElastiCache Redis cluster..."
aws elasticache create-cache-cluster \
    --cache-cluster-id openbb-redis \
    --engine redis \
    --cache-node-type cache.t3.micro \
    --num-cache-nodes 1 \
    --security-group-ids $CACHE_SG_ID \
    --region $AWS_REGION

if [ $? -eq 0 ]; then
    echo "ElastiCache cluster creation initiated. It will take 5-10 minutes to be available."
else
    echo "ElastiCache cluster might already exist or creation failed."
fi

# Output configuration
echo ""
echo "=== AWS Resources Created ==="
echo "RDS Security Group ID: $RDS_SG_ID"
echo "ElastiCache Security Group ID: $CACHE_SG_ID"
echo ""
echo "Waiting for resources to be available..."
echo "You can check the status with:"
echo "  aws rds describe-db-instances --db-instance-identifier openbb-postgres --region $AWS_REGION"
echo "  aws elasticache describe-cache-clusters --cache-cluster-id openbb-redis --region $AWS_REGION"
echo ""
echo "Once available, update your .env file with the endpoints."