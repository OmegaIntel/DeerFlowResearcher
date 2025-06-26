#!/bin/bash

# Deploy to EC2 instance
EC2_USER="ubuntu"
EC2_HOST="23.22.140.7"
REMOTE_DIR="/home/ubuntu/openbb"

echo "Deploying to EC2..."

# Create tar archive excluding unnecessary files
echo "Creating archive..."
tar -czf openbb-deploy.tar.gz \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  --exclude='.pytest_cache' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='.env.local' \
  --exclude='openbb-deploy.tar.gz' \
  .

# Copy archive to EC2
echo "Copying to EC2..."
scp -o StrictHostKeyChecking=no openbb-deploy.tar.gz $EC2_USER@$EC2_HOST:/tmp/

# Deploy on EC2
echo "Deploying on EC2..."
ssh -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST << 'EOF'
cd /home/ubuntu
rm -rf openbb-backup
mv openbb openbb-backup 2>/dev/null || true
mkdir -p openbb
cd openbb
tar -xzf /tmp/openbb-deploy.tar.gz
rm /tmp/openbb-deploy.tar.gz

# Copy env file if exists
if [ -f ../openbb-backup/.env.aws ]; then
  cp ../openbb-backup/.env.aws .
fi

# Rebuild and restart containers
docker-compose -f docker-compose.aws.yml down
docker-compose -f docker-compose.aws.yml up -d --build

echo "Deployment complete!"
EOF

# Clean up local archive
rm openbb-deploy.tar.gz

echo "Deployment finished!"