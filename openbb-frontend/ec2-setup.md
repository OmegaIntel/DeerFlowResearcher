# EC2 Instance Setup for OpenBB Frontend

## EC2 Instance Configuration

### Recommended Instance Type
- **Instance Type**: t3.medium (2 vCPU, 4 GB RAM)
- **Alternative**: t3.small for development/testing
- **AMI**: Ubuntu 24.04 LTS or Amazon Linux 2023

### Storage
- **Volume Type**: GP3
- **Size**: 20 GB

### Security Group Rules
Create a security group with these rules:

**Inbound Rules:**
- SSH (22): Your IP address
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- Custom TCP (3000): 0.0.0.0/0 (for development server)

**Outbound Rules:**
- All traffic: 0.0.0.0/0

## Launch Instance Steps

1. Go to EC2 Console
2. Click "Launch Instance"
3. Configure:
   - Name: `openbb-frontend-server`
   - AMI: Ubuntu 24.04 LTS
   - Instance type: t3.medium
   - Key pair: Create new or select existing
   - Network settings: Create security group with rules above
   - Storage: 20 GB gp3
   - Advanced details: Add User data script (see below)

## User Data Script

Use this script in the "User data" field when launching the instance:

```bash
#!/bin/bash
# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs git nginx

# Install PM2 globally
npm install -g pm2

# Create app directory
mkdir -p /var/www/openbb-frontend
cd /var/www/openbb-frontend

# Clone your repository (replace with your actual repo URL)
# git clone https://github.com/yourusername/openbb-frontend.git .
# OR upload your code manually later

# Create a simple deployment script
cat > /home/ubuntu/deploy.sh << 'EOF'
#!/bin/bash
cd /var/www/openbb-frontend
npm install
npm run build
pm2 restart openbb-frontend || pm2 start server.js --name openbb-frontend
EOF

chmod +x /home/ubuntu/deploy.sh

# Configure Nginx
cat > /etc/nginx/sites-available/openbb-frontend << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/openbb-frontend /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Configure PM2 to start on boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

## Manual Deployment Steps

After the instance is running:

1. **Connect to your instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-public-ip
   ```

2. **Upload your code:**
   ```bash
   # From your local machine
   scp -i your-key.pem -r /path/to/openbb-frontend/* ubuntu@your-ec2-public-ip:/var/www/openbb-frontend/
   ```

3. **Install dependencies and build:**
   ```bash
   cd /var/www/openbb-frontend
   npm install
   npm run build
   ```

4. **Start the application:**
   ```bash
   # For production with PM2
   pm2 start server.js --name openbb-frontend
   pm2 save
   
   # Or for development
   npm run dev
   ```

5. **Access your application:**
   - Development: `http://your-ec2-public-ip:3000`
   - Production (via Nginx): `http://your-ec2-public-ip`

## Alternative: Using Docker

Create a Dockerfile:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.js"]
```

Then on EC2:
```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo usermod -aG docker ubuntu

# Build and run
docker build -t openbb-frontend .
docker run -d -p 80:3000 --name openbb-app openbb-frontend
```

## SSL/HTTPS Setup (Optional)

For production, set up SSL with Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring

Set up basic monitoring:

```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# View logs
pm2 logs openbb-frontend

# Monitor app
pm2 monit
```

## Cost Estimation

- t3.medium: ~$0.0416/hour (~$30/month)
- Storage (20GB): ~$1.60/month
- Data transfer: Variable based on usage
- **Total**: ~$32-40/month for basic setup