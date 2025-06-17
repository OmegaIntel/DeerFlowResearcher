#!/bin/bash

echo "Setting up HTTPS with Let's Encrypt..."

# Install certbot
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate
sudo certbot --nginx -d getomegaintel.com -d www.getomegaintel.com --non-interactive --agree-tos --email admin@getomegaintel.com

echo "HTTPS setup complete!"
echo ""
echo "Don't forget to update Google OAuth to use HTTPS URLs:"
echo "- https://www.getomegaintel.com/api/auth/google/callback"
echo "- https://getomegaintel.com/api/auth/google/callback"