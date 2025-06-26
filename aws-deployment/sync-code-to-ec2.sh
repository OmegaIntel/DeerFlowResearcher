#!/bin/bash

# Script to sync the working OpenBB code to EC2 instance

if [ $# -lt 2 ]; then
    echo "Usage: $0 <EC2_IP> <KEY_FILE>"
    echo "Example: $0 54.123.45.67 openbb-key.pem"
    exit 1
fi

EC2_IP=$1
KEY_FILE=$2

echo "Syncing OpenBB code to EC2 instance at $EC2_IP..."

# Create a deployment package
echo "Creating deployment package..."
cd /root/openBB

# Create temp directory
mkdir -p /tmp/openbb-deploy
cp -r openbb-backend /tmp/openbb-deploy/
cp -r openbb-frontend /tmp/openbb-deploy/
cp .env.aws /tmp/openbb-deploy/

# Copy the complete backend code
cp openbb-backend/api/main_complete.py /tmp/openbb-deploy/openbb-backend/api/
cp openbb-backend/Dockerfile.complete /tmp/openbb-deploy/openbb-backend/Dockerfile
cp openbb-backend/config.py /tmp/openbb-deploy/openbb-backend/

# Create deployment docker-compose
cat > /tmp/openbb-deploy/docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: 
      context: ./openbb-backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - .env.aws
    environment:
      - REDIS_URL=redis://openbb-redis.lz05va.0001.use1.cache.amazonaws.com:6379
      - MINDSDB_URL=http://mindsdb:47334
      - PYTHONUNBUFFERED=1
    restart: always
    networks:
      - openbb-network

  frontend:
    build: ./openbb-frontend
    ports:
      - "80:3000"
      - "3000:3000"
    environment:
      - VITE_API_BASE_URL=http://backend:8000
    depends_on:
      - backend
    restart: always
    networks:
      - openbb-network

  mindsdb:
    image: mindsdb/mindsdb:latest
    ports:
      - "47334:47334"
      - "47335:47335"
    environment:
      - MINDSDB_STORAGE_DIR=/opt/mindsdb/storage
    volumes:
      - mindsdb_data:/opt/mindsdb/storage
    restart: always
    networks:
      - openbb-network

  onlyoffice:
    image: onlyoffice/documentserver:latest
    ports:
      - "9080:80"
    environment:
      - JWT_ENABLED=false
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
    restart: always
    networks:
      - openbb-network

networks:
  openbb-network:
    driver: bridge

volumes:
  mindsdb_data:
  onlyoffice_data:
EOF

# Update backend Dockerfile to use complete app
sed -i 's/main:app/api.main_complete:app/g' /tmp/openbb-deploy/openbb-backend/Dockerfile

# Compress the deployment package
cd /tmp
tar -czf openbb-deploy.tar.gz openbb-deploy/

# Copy to EC2
echo "Copying deployment package to EC2..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no openbb-deploy.tar.gz ec2-user@$EC2_IP:/home/ec2-user/

# SSH to EC2 and deploy
echo "Deploying on EC2..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'ENDSSH'
# Extract deployment package
cd /home/ec2-user
tar -xzf openbb-deploy.tar.gz
sudo rm -rf /opt/openbb
sudo mv openbb-deploy /opt/openbb
sudo chown -R ec2-user:ec2-user /opt/openbb

# Stop existing services
cd /opt/openbb
sudo docker-compose down

# Build and start new services
sudo docker-compose build
sudo docker-compose up -d

# Check status
echo "Waiting for services to start..."
sleep 10
sudo docker-compose ps

# Test ElastiCache connection
echo "Testing ElastiCache connection..."
curl -s http://localhost:8000/api/v1/test/redis | jq

echo "Deployment complete!"
ENDSSH

# Cleanup
rm -rf /tmp/openbb-deploy*

echo "========================================"
echo "Deployment to EC2 Complete!"
echo "========================================"
echo ""
echo "Access the application at:"
echo "  http://$EC2_IP"
echo ""