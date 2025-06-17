#!/bin/bash

echo "Setting up domain for getomegaintel.com..."

# Install NGINX if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing NGINX..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Copy NGINX configuration
echo "Configuring NGINX..."
sudo cp nginx.conf /etc/nginx/sites-available/getomegaintel
sudo ln -sf /etc/nginx/sites-available/getomegaintel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test NGINX configuration
echo "Testing NGINX configuration..."
sudo nginx -t

# Restart NGINX
echo "Restarting NGINX..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "NGINX setup complete!"
echo ""
echo "Next steps:"
echo "1. Point your domain DNS to this EC2 instance IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "2. Update Google OAuth redirect URIs to:"
echo "   - http://www.getomegaintel.com/api/auth/google/callback"
echo "   - http://getomegaintel.com/api/auth/google/callback"
echo ""
echo "For HTTPS (recommended):"
echo "Run: sudo certbot --nginx -d getomegaintel.com -d www.getomegaintel.com"