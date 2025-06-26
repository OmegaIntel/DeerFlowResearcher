#!/bin/bash

# Check ElastiCache Status Script

echo "=== Checking ElastiCache Status ==="
echo ""

# Source AWS credentials
if [ -f "../.env.aws" ]; then
    export $(grep -v '^#' ../.env.aws | xargs)
else
    echo "❌ Error: .env.aws file not found!"
    exit 1
fi

CACHE_CLUSTER_ID="openbb-redis"

# Check cluster status
echo "Checking status of ElastiCache cluster: $CACHE_CLUSTER_ID"
echo ""

CLUSTER_INFO=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "$CACHE_CLUSTER_ID" \
    --show-cache-node-info \
    --query 'CacheClusters[0]' \
    --output json 2>/dev/null)

if [ $? -eq 0 ]; then
    # Extract information
    STATUS=$(echo "$CLUSTER_INFO" | jq -r '.CacheClusterStatus')
    ENDPOINT=$(echo "$CLUSTER_INFO" | jq -r '.CacheNodes[0].Endpoint.Address // empty')
    PORT=$(echo "$CLUSTER_INFO" | jq -r '.CacheNodes[0].Endpoint.Port // empty')
    
    echo "Status: $STATUS"
    
    if [ "$STATUS" == "available" ]; then
        echo "✅ ElastiCache cluster is ready!"
        echo ""
        echo "Endpoint: $ENDPOINT"
        echo "Port: $PORT"
        echo ""
        
        # Update .env.aws with the endpoint
        if [ ! -z "$ENDPOINT" ]; then
            sed -i "s/AWS_REDIS_HOST=.*/AWS_REDIS_HOST=$ENDPOINT/" ../.env.aws
            sed -i "s|REDIS_URL=.*|REDIS_URL=redis://$ENDPOINT:$PORT|" ../.env.aws
            echo "✅ Updated .env.aws with ElastiCache endpoint"
        fi
        
        # Test Redis connection
        echo ""
        echo "Testing Redis connection..."
        if command -v redis-cli &> /dev/null; then
            redis-cli -h "$ENDPOINT" -p "$PORT" ping
            if [ $? -eq 0 ]; then
                echo "✅ Redis connection successful!"
            else
                echo "⚠️  Could not connect to Redis. Check security group settings."
            fi
        else
            echo "redis-cli not found. Install with: sudo apt-get install redis-tools"
        fi
    elif [ "$STATUS" == "creating" ]; then
        echo "⏳ Cluster is still being created. Please wait..."
        echo "Check again in a few minutes."
    else
        echo "⚠️  Cluster status: $STATUS"
    fi
else
    echo "❌ Could not find ElastiCache cluster: $CACHE_CLUSTER_ID"
    echo ""
    echo "To create the cluster, run: ./setup-elasticache.sh"
fi