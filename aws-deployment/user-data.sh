#!/bin/bash
# User data script for EC2 instance

# Update system
yum update -y

# Install Docker
yum install -y docker git
service docker start
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /home/ec2-user/openbb
cd /home/ec2-user/openbb

# Create docker-compose file for production
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: openbb-backend-vpc:latest
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://openbb-redis.lz05va.0001.use1.cache.amazonaws.com:6379
      - AWS_RDS_HOST=omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com
      - AWS_RDS_PORT=3306
      - AWS_RDS_DATABASE=omni_ai
      - AWS_RDS_USERNAME=admin
      - AWS_RDS_PASSWORD=7atwj76e
      - MINDSDB_URL=http://mindsdb:47334
    restart: always
    networks:
      - openbb-network

  frontend:
    image: openbb-frontend-vpc:latest
    ports:
      - "80:3000"
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

# Set ownership
chown -R ec2-user:ec2-user /home/ec2-user/openbb

# Create systemd service
cat > /etc/systemd/system/openbb.service << 'EOF'
[Unit]
Description=OpenBB Application
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/home/ec2-user/openbb
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
User=ec2-user
Group=ec2-user

[Install]
WantedBy=multi-user.target
EOF

# Enable service
systemctl daemon-reload
systemctl enable openbb.service

echo "EC2 instance setup complete!"