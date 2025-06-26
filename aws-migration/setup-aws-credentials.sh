#!/bin/bash

# Setup AWS Credentials Script
# This script helps you configure AWS credentials securely

echo "=== AWS Credentials Setup ==="
echo "This script will help you configure AWS credentials for the migration."
echo ""

# Create AWS config directory if it doesn't exist
mkdir -p ~/.aws

# Function to prompt for input with masking for passwords
read_secret() {
    local prompt="$1"
    local var_name="$2"
    echo -n "$prompt"
    read -s value
    echo ""
    eval "$var_name='$value'"
}

# Prompt for AWS credentials
echo "Please enter your AWS credentials:"
read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
read_secret "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
read -p "AWS Region [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

# Create AWS credentials file
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = $AWS_ACCESS_KEY_ID
aws_secret_access_key = $AWS_SECRET_ACCESS_KEY
EOF

# Create AWS config file
cat > ~/.aws/config << EOF
[default]
region = $AWS_REGION
output = json
EOF

# Set proper permissions
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config

echo ""
echo "✅ AWS credentials configured successfully!"

# Now prompt for RDS credentials
echo ""
echo "=== RDS MySQL Configuration ==="
echo "Using existing RDS instance: omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com"
echo ""

read -p "RDS Username: " RDS_USERNAME
read_secret "RDS Password: " RDS_PASSWORD
read -p "RDS Database Name [openbb_db]: " RDS_DATABASE
RDS_DATABASE=${RDS_DATABASE:-openbb_db}

# Update .env.aws file with actual values
if [ -f "../.env.aws" ]; then
    # Backup existing file
    cp ../.env.aws ../.env.aws.backup
    
    # Update with actual values
    sed -i "s/AWS_ACCESS_KEY_ID=.*/AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID/" ../.env.aws
    sed -i "s/AWS_SECRET_ACCESS_KEY=.*/AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY/" ../.env.aws
    sed -i "s/AWS_RDS_USERNAME=.*/AWS_RDS_USERNAME=$RDS_USERNAME/" ../.env.aws
    sed -i "s/AWS_RDS_PASSWORD=.*/AWS_RDS_PASSWORD=$RDS_PASSWORD/" ../.env.aws
    sed -i "s/AWS_RDS_DATABASE=.*/AWS_RDS_DATABASE=$RDS_DATABASE/" ../.env.aws
    
    # Update DATABASE_URL
    DATABASE_URL="mysql://${RDS_USERNAME}:${RDS_PASSWORD}@omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com:3306/${RDS_DATABASE}"
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" ../.env.aws
    
    echo "✅ Updated .env.aws with your credentials"
else
    echo "⚠️  .env.aws file not found. Please create it first."
fi

echo ""
echo "=== Next Steps ==="
echo "1. Run ./check-rds-connection.sh to verify RDS connectivity"
echo "2. Run ./setup-elasticache.sh to create ElastiCache cluster"
echo "3. Run ./finalize-migration.sh to complete the setup"
echo ""
echo "⚠️  IMPORTANT: Keep your credentials secure and never commit them to git!"