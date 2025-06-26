#!/bin/bash
# OpenBB Frontend EC2 User Data Script
# This script runs automatically when the EC2 instance starts

# Log all output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting OpenBB Frontend setup..."

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs git nginx

# Install PM2 globally
npm install -g pm2

# Create app user and directory
useradd -m -s /bin/bash openbb
mkdir -p /var/www/openbb-frontend
chown -R openbb:openbb /var/www/openbb-frontend

# Install build tools (needed for some npm packages)
apt-get install -y build-essential

# Configure Nginx
cat > /etc/nginx/sites-available/openbb-frontend << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Serve static files directly
    location / {
        root /var/www/openbb-frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (if you have a backend)
    location /api {
        proxy_pass http://localhost:3001;
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
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Configure PM2 to start on boot
su - openbb -c "pm2 startup systemd -u openbb --hp /home/openbb" | tail -n 1 | bash

# Create deployment helper script
cat > /home/openbb/deploy.sh << 'EOF'
#!/bin/bash
cd /var/www/openbb-frontend

echo "Installing dependencies..."
npm ci --production

echo "Building application..."
npm run build

echo "Restarting services..."
sudo systemctl restart nginx

echo "Deployment complete!"
EOF

chmod +x /home/openbb/deploy.sh
chown openbb:openbb /home/openbb/deploy.sh

# Create a systemd service for the Express server (if using server.js)
cat > /etc/systemd/system/openbb-frontend.service << 'EOF'
[Unit]
Description=OpenBB Frontend Server
After=network.target

[Service]
Type=simple
User=openbb
WorkingDirectory=/var/www/openbb-frontend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=openbb-frontend
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

systemctl enable openbb-frontend

echo "OpenBB Frontend setup complete!"
echo "Next steps:"
echo "1. Upload your code to /var/www/openbb-frontend"
echo "2. Run: sudo -u openbb /home/openbb/deploy.sh"
echo "3. Start the service: sudo systemctl start openbb-frontend"