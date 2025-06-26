#!/bin/bash
# Add port 3000 to security group for development access

# Get the instance ID from EC2 metadata
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

# Get the security group ID
SG_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)

echo "Adding port 3000 to security group $SG_ID..."

# Add inbound rule for port 3000
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0 \
    --group-rule-description "Development server access"

if [ $? -eq 0 ]; then
    echo "Port 3000 successfully added to security group!"
else
    echo "Failed to add port 3000. It might already exist."
fi