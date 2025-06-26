#!/bin/bash

# OpenBB VPC Deployment Script
# This script deploys the OpenBB application to an EC2 instance in the same VPC as ElastiCache

set -e

echo "========================================"
echo "OpenBB VPC Deployment Script"
echo "========================================"

# Configuration
REGION="us-east-1"
VPC_ID="vpc-0837fe0c8dda53d06"  # Default VPC where ElastiCache is
SUBNET_ID="subnet-0c9deaf639e5a6bb9"  # Same subnet as ElastiCache
ELASTICACHE_SG="sg-0cc67dbc1a403018c"  # ElastiCache security group
KEY_NAME="${1:-openbb-key}"  # Pass key name as first argument
INSTANCE_TYPE="t3.medium"

# Create key pair if it doesn't exist
echo "Checking for SSH key pair..."
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region $REGION >/dev/null 2>&1; then
    echo "Creating new key pair: $KEY_NAME"
    aws ec2 create-key-pair --key-name "$KEY_NAME" --region $REGION --query 'KeyMaterial' --output text > "${KEY_NAME}.pem"
    chmod 400 "${KEY_NAME}.pem"
    echo "Key pair created and saved to ${KEY_NAME}.pem"
else
    echo "Key pair $KEY_NAME already exists"
fi

# Create security group for EC2
echo "Creating security group for EC2..."
SG_ID=$(aws ec2 create-security-group \
    --group-name "OpenBB-EC2-VPC-SG" \
    --description "Security group for OpenBB EC2 in VPC" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --output text --query 'GroupId' 2>/dev/null || \
    aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=OpenBB-EC2-VPC-SG" \
        --region $REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text)

echo "Security Group ID: $SG_ID"

# Add ingress rules
echo "Configuring security group rules..."
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8000 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 47334-47335 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 9080 --cidr 0.0.0.0/0 --region $REGION 2>/dev/null || true

# Allow EC2 to access ElastiCache
echo "Allowing EC2 to access ElastiCache..."
aws ec2 authorize-security-group-ingress \
    --group-id $ELASTICACHE_SG \
    --protocol tcp \
    --port 6379 \
    --source-group $SG_ID \
    --region $REGION 2>/dev/null || true

# Get latest Amazon Linux 2 AMI
AMI_ID=$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text \
    --region $REGION)

echo "Using AMI: $AMI_ID"

# Create user data script
cat > user-data.txt << 'USERDATA'
#!/bin/bash
# Log all output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting OpenBB deployment..."

# Update system
yum update -y

# Install Docker and required packages
amazon-linux-extras install docker -y
yum install -y git
service docker start
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Create working directory
mkdir -p /opt/openbb
cd /opt/openbb

# Create environment file
cat > .env.aws << 'EOF'
# AWS Services
REDIS_URL=redis://openbb-redis.lz05va.0001.use1.cache.amazonaws.com:6379
AWS_RDS_HOST=omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com
AWS_RDS_PORT=3306
AWS_RDS_DATABASE=omni_ai
AWS_RDS_USERNAME=admin
AWS_RDS_PASSWORD=7atwj76e

# API Keys
BENZINGA_API_KEY=bz.PG3WR7XJKES5P7TZ2LXT7RHE6PAHQXER
API_NINJAS_KEY=iYRHbEOeV8cc0T40ssPtAg==CcrRA2Z4aeTlndpj
OPENAI_API_KEY=${OPENAI_API_KEY}
ALPHA_VANTAGE_API_KEY=VZ2CMIJ69RQVHKZA
POLYGON_API_KEY=NJGhzP6EKVEg3kOJ6VKScKQT7fjWdpkD
FMP_API_KEY=N1bBgINdiUtb2j8Dy3KCdMCH9EKd7Qgv

# Service URLs
MINDSDB_URL=http://mindsdb:47334
EOF

# Create directories for code
mkdir -p openbb-backend openbb-frontend

# Create backend files
mkdir -p openbb-backend/api
cat > openbb-backend/requirements_minimal.txt << 'EOF'
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
redis>=5.0.0
httpx>=0.25.0
pandas>=2.1.0
numpy>=1.24.0
requests>=2.31.0
yfinance>=0.2.28
alpha-vantage>=2.3.1
pymysql>=1.1.0
DBUtils>=3.0.0
openai>=0.28.1
boto3>=1.26.0
openpyxl>=3.1.0
python-multipart>=0.0.6
EOF

# Copy the backend code (you'll need to add the actual Python files)
# For now, create a simple health check endpoint
cat > openbb-backend/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="OpenBB API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "OpenBB Backend API is running in VPC"}

@app.get("/health")
def health():
    redis_url = os.getenv("REDIS_URL", "Not configured")
    return {
        "status": "healthy",
        "environment": "AWS VPC",
        "redis": redis_url,
        "rds": os.getenv("AWS_RDS_HOST", "Not configured")
    }

@app.get("/api/v1/test/redis")
async def test_redis():
    try:
        import redis
        r = redis.from_url(os.getenv('REDIS_URL'))
        r.ping()
        return {"success": True, "message": "ElastiCache Redis connected!"}
    except Exception as e:
        return {"success": False, "error": str(e)}
EOF

# Create Dockerfile for backend
cat > openbb-backend/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*
COPY requirements_minimal.txt .
RUN pip install --no-cache-dir -r requirements_minimal.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Create simple frontend
cat > openbb-frontend/Dockerfile << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
EXPOSE 80
EOF

cat > openbb-frontend/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>OpenBB - VPC Deployment</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; }
        .status { padding: 20px; background: #f0f0f0; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>OpenBB Application - VPC Deployment</h1>
    <div class="status">
        <h2>Deployment Status</h2>
        <p id="backend-status">Checking backend...</p>
        <p id="redis-status">Checking ElastiCache...</p>
    </div>
    <script>
        // Check backend status
        fetch('http://' + window.location.hostname + ':8000/health')
            .then(r => r.json())
            .then(data => {
                document.getElementById('backend-status').innerHTML = 
                    '<span class="success">✓ Backend: ' + data.status + '</span>';
            })
            .catch(err => {
                document.getElementById('backend-status').innerHTML = 
                    '<span class="error">✗ Backend: Error connecting</span>';
            });
        
        // Check Redis
        fetch('http://' + window.location.hostname + ':8000/api/v1/test/redis')
            .then(r => r.json())
            .then(data => {
                document.getElementById('redis-status').innerHTML = 
                    data.success ? 
                    '<span class="success">✓ ElastiCache: Connected</span>' :
                    '<span class="error">✗ ElastiCache: ' + data.error + '</span>';
            })
            .catch(err => {
                document.getElementById('redis-status').innerHTML = 
                    '<span class="error">✗ ElastiCache: Cannot check</span>';
            });
    </script>
</body>
</html>
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: ./openbb-backend
    ports:
      - "8000:8000"
    env_file:
      - .env.aws
    environment:
      - PYTHONUNBUFFERED=1
    restart: always
    networks:
      - openbb-network

  frontend:
    build: ./openbb-frontend
    ports:
      - "80:80"
      - "3000:3000"
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

# Build and start services
cd /opt/openbb
docker-compose build
docker-compose up -d

# Create systemd service
cat > /etc/systemd/system/openbb.service << 'EOF'
[Unit]
Description=OpenBB Application
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/openbb
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable openbb.service

echo "OpenBB deployment completed!"
USERDATA

# Launch EC2 instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --user-data file://user-data.txt \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=OpenBB-VPC-Instance},{Key=Application,Value=OpenBB}]" \
    --region $REGION \
    --output text \
    --query 'Instances[0].InstanceId')

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
echo "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get instance details
INSTANCE_INFO=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].[PublicIpAddress,PrivateIpAddress]' \
    --output text)

PUBLIC_IP=$(echo $INSTANCE_INFO | cut -d' ' -f1)
PRIVATE_IP=$(echo $INSTANCE_INFO | cut -d' ' -f2)

# Allocate and associate Elastic IP
echo "Allocating Elastic IP..."
ALLOCATION_ID=$(aws ec2 allocate-address --domain vpc --region $REGION --query 'AllocationId' --output text)
aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $ALLOCATION_ID --region $REGION

# Get the Elastic IP
ELASTIC_IP=$(aws ec2 describe-addresses --allocation-ids $ALLOCATION_ID --region $REGION --query 'Addresses[0].PublicIp' --output text)

# Clean up
rm -f user-data.txt

echo "========================================"
echo "OpenBB VPC Deployment Complete!"
echo "========================================"
echo ""
echo "Instance ID: $INSTANCE_ID"
echo "Elastic IP: $ELASTIC_IP"
echo "Private IP: $PRIVATE_IP"
echo ""
echo "Access URLs:"
echo "  Frontend:    http://$ELASTIC_IP"
echo "  Backend API: http://$ELASTIC_IP:8000"
echo "  API Docs:    http://$ELASTIC_IP:8000/docs"
echo "  MindsDB:     http://$ELASTIC_IP:47334"
echo "  OnlyOffice:  http://$ELASTIC_IP:9080"
echo ""
echo "SSH Access:"
echo "  ssh -i ${KEY_NAME}.pem ec2-user@$ELASTIC_IP"
echo ""
echo "Note: It may take 5-10 minutes for all services to be fully available."
echo ""
echo "To check deployment status:"
echo "  1. SSH into the instance"
echo "  2. Run: sudo docker-compose -f /opt/openbb/docker-compose.yml ps"
echo "  3. Check logs: sudo docker-compose -f /opt/openbb/docker-compose.yml logs"
echo ""