#!/bin/bash

# Setup ElastiCache Redis Script

echo "=== Setting up AWS ElastiCache Redis ==="
echo ""

# Source AWS credentials
if [ -f "../.env.aws" ]; then
    export $(grep -v '^#' ../.env.aws | xargs)
else
    echo "❌ Error: .env.aws file not found!"
    echo "Please run ./setup-aws-credentials.sh first"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found. Installing..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf awscliv2.zip aws/
fi

# Variables
CACHE_CLUSTER_ID="openbb-redis"
CACHE_NODE_TYPE="cache.t3.micro"
ENGINE="redis"
ENGINE_VERSION="7.0"
NUM_CACHE_NODES="1"
SECURITY_GROUP_NAME="openbb-elasticache-sg"
SUBNET_GROUP_NAME="openbb-cache-subnet"

# Get default VPC
echo "Getting default VPC..."
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)
echo "Default VPC: $DEFAULT_VPC"

# Create security group for ElastiCache
echo ""
echo "Creating security group for ElastiCache..."
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
    --group-name "$SECURITY_GROUP_NAME" \
    --description "Security group for OpenBB ElastiCache Redis" \
    --vpc-id "$DEFAULT_VPC" \
    --query 'GroupId' \
    --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "Created security group: $SECURITY_GROUP_ID"
else
    # Security group might already exist
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
    echo "Using existing security group: $SECURITY_GROUP_ID"
fi

# Add inbound rules
echo "Adding inbound rules to security group..."

# Get current IP
CURRENT_IP=$(curl -s ifconfig.me)
echo "Your current IP: $CURRENT_IP"

# Allow Redis port from current IP
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 6379 \
    --cidr "$CURRENT_IP/32" 2>/dev/null

# Allow from VPC CIDR for internal access
VPC_CIDR=$(aws ec2 describe-vpcs --vpc-ids "$DEFAULT_VPC" --query "Vpcs[0].CidrBlock" --output text)
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 6379 \
    --cidr "$VPC_CIDR" 2>/dev/null

echo "Security group configured"

# Get subnet IDs for cache subnet group
echo ""
echo "Getting subnets for cache subnet group..."
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$DEFAULT_VPC" \
    --query "Subnets[*].SubnetId" \
    --output text)

# Create cache subnet group
echo "Creating cache subnet group..."
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name "$SUBNET_GROUP_NAME" \
    --cache-subnet-group-description "Subnet group for OpenBB ElastiCache" \
    --subnet-ids $SUBNET_IDS 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Cache subnet group might already exist, continuing..."
fi

# Create ElastiCache cluster
echo ""
echo "Creating ElastiCache Redis cluster..."
echo "This will take 5-10 minutes..."

aws elasticache create-cache-cluster \
    --cache-cluster-id "$CACHE_CLUSTER_ID" \
    --engine "$ENGINE" \
    --engine-version "$ENGINE_VERSION" \
    --cache-node-type "$CACHE_NODE_TYPE" \
    --num-cache-nodes "$NUM_CACHE_NODES" \
    --security-group-ids "$SECURITY_GROUP_ID" \
    --cache-subnet-group-name "$SUBNET_GROUP_NAME" \
    --tags "Key=Project,Value=OpenBB" "Key=Environment,Value=Production"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ElastiCache cluster creation initiated!"
    echo ""
    echo "Cluster ID: $CACHE_CLUSTER_ID"
    echo "Node Type: $CACHE_NODE_TYPE"
    echo "Security Group: $SECURITY_GROUP_ID"
    echo ""
    echo "⏳ The cluster is being created. This typically takes 5-10 minutes."
    echo ""
    echo "To check the status, run:"
    echo "aws elasticache describe-cache-clusters --cache-cluster-id $CACHE_CLUSTER_ID"
    echo ""
    echo "Or run ./check-elasticache-status.sh"
else
    echo ""
    echo "❌ Failed to create ElastiCache cluster"
    echo "The cluster might already exist. Checking..."
    aws elasticache describe-cache-clusters --cache-cluster-id "$CACHE_CLUSTER_ID" --show-cache-node-info
fi

# Update security group ID in .env.aws
sed -i "s/ELASTICACHE_SECURITY_GROUP_ID=.*/ELASTICACHE_SECURITY_GROUP_ID=$SECURITY_GROUP_ID/" ../.env.aws 2>/dev/null

echo ""
echo "Next step: Wait for the cluster to be available, then run ./finalize-migration.sh"