#!/bin/bash
# Script to create security group for OpenBB Frontend

# Set your AWS region
AWS_REGION="us-east-1"
VPC_ID=""  # Leave empty to use default VPC

# Get your current IP address
MY_IP=$(curl -s https://checkip.amazonaws.com)

echo "Creating security group for OpenBB Frontend..."
echo "Your current IP: $MY_IP"

# Create security group
if [ -z "$VPC_ID" ]; then
    SG_ID=$(aws ec2 create-security-group \
        --group-name openbb-frontend-sg \
        --description "Security group for OpenBB Frontend application" \
        --region $AWS_REGION \
        --output text \
        --query 'GroupId')
else
    SG_ID=$(aws ec2 create-security-group \
        --group-name openbb-frontend-sg \
        --description "Security group for OpenBB Frontend application" \
        --vpc-id $VPC_ID \
        --region $AWS_REGION \
        --output text \
        --query 'GroupId')
fi

if [ $? -eq 0 ]; then
    echo "Security group created: $SG_ID"
else
    echo "Failed to create security group"
    exit 1
fi

# Add inbound rules
echo "Adding inbound rules..."

# SSH access from your IP
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr $MY_IP/32 \
    --region $AWS_REGION

# HTTP access from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

# HTTPS access from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION

# Tag the security group
aws ec2 create-tags \
    --resources $SG_ID \
    --tags Key=Name,Value=openbb-frontend-sg Key=Application,Value=OpenBB-Frontend \
    --region $AWS_REGION

echo "Security group setup complete!"
echo "Security Group ID: $SG_ID"
echo ""
echo "You can now use this security group when launching your EC2 instance."