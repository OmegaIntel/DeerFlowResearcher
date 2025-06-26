#!/bin/bash
# Quick deployment script for OpenBB Frontend on EC2

echo "OpenBB Frontend EC2 Deployment Script"
echo "====================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Variables
INSTANCE_TYPE="t3.medium"
KEY_NAME=""  # Set your key pair name
AMI_ID=""    # Will be auto-detected if not set
REGION="us-east-1"

# Get latest Ubuntu 24.04 AMI if not specified
if [ -z "$AMI_ID" ]; then
    echo "Finding latest Ubuntu 24.04 AMI..."
    AMI_ID=$(aws ec2 describe-images \
        --owners 099720109477 \
        --filters \
            "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*" \
            "Name=state,Values=available" \
        --query 'Images[0].ImageId' \
        --output text \
        --region $REGION)
    echo "Using AMI: $AMI_ID"
fi

# Check for key pair
if [ -z "$KEY_NAME" ]; then
    echo "ERROR: Please set KEY_NAME variable in the script"
    echo "Available key pairs:"
    aws ec2 describe-key-pairs --query 'KeyPairs[*].KeyName' --output table --region $REGION
    exit 1
fi

# Create security group
echo "Creating security group..."
bash ./create-security-group.sh

# Get the security group ID
SG_ID=$(aws ec2 describe-security-groups \
    --group-names openbb-frontend-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $REGION)

# Launch instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --user-data file://user-data.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=openbb-frontend},{Key=Application,Value=OpenBB-Frontend}]' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $REGION)

if [ $? -eq 0 ]; then
    echo "Instance launched: $INSTANCE_ID"
else
    echo "Failed to launch instance"
    exit 1
fi

# Wait for instance to be running
echo "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $REGION)

echo ""
echo "========================================="
echo "EC2 Instance launched successfully!"
echo "========================================="
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "SSH: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "Next steps:"
echo "1. Wait 5-10 minutes for initial setup to complete"
echo "2. SSH into the instance"
echo "3. Upload your code to /var/www/openbb-frontend"
echo "4. Run: sudo -u openbb /home/openbb/deploy.sh"
echo "5. Access your app at: http://$PUBLIC_IP"
echo "========================================="