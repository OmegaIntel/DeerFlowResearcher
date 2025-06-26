#!/bin/bash

# Check RDS MySQL Connection Script

echo "=== Checking RDS MySQL Connection ==="
echo ""

# Source the environment variables
if [ -f "../.env.aws" ]; then
    export $(grep -v '^#' ../.env.aws | xargs)
else
    echo "❌ Error: .env.aws file not found!"
    echo "Please run ./setup-aws-credentials.sh first"
    exit 1
fi

# Check if MySQL client is installed
if ! command -v mysql &> /dev/null; then
    echo "MySQL client not found. Installing..."
    sudo apt-get update -qq
    sudo apt-get install -y mysql-client
fi

# Test connection
echo "Testing connection to RDS MySQL..."
echo "Host: $AWS_RDS_HOST"
echo "Port: $AWS_RDS_PORT"
echo "Database: $AWS_RDS_DATABASE"
echo ""

# Try to connect
mysql -h "$AWS_RDS_HOST" \
      -P "$AWS_RDS_PORT" \
      -u "$AWS_RDS_USERNAME" \
      -p"$AWS_RDS_PASSWORD" \
      -e "SELECT VERSION();" \
      "$AWS_RDS_DATABASE" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully connected to RDS MySQL!"
    
    # Check if openbb tables exist
    echo ""
    echo "Checking existing tables..."
    mysql -h "$AWS_RDS_HOST" \
          -P "$AWS_RDS_PORT" \
          -u "$AWS_RDS_USERNAME" \
          -p"$AWS_RDS_PASSWORD" \
          -e "SHOW TABLES;" \
          "$AWS_RDS_DATABASE" 2>&1
else
    echo ""
    echo "❌ Failed to connect to RDS MySQL"
    echo ""
    echo "Common issues:"
    echo "1. Check your AWS credentials are correct"
    echo "2. Ensure the RDS instance is publicly accessible"
    echo "3. Check security group allows inbound MySQL (port 3306) from your IP"
    echo "4. Verify the RDS instance is running"
    echo ""
    echo "To check your current IP:"
    echo "curl -s ifconfig.me"
    echo ""
    echo "Your current IP is: $(curl -s ifconfig.me)"
fi