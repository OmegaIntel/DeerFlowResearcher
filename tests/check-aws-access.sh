#!/bin/bash

echo "AWS EC2 Access Diagnostics"
echo "=========================="
echo ""

# Get instance info
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "Unknown")
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "Unknown")

echo "Public IP: $PUBLIC_IP"
echo "Instance ID: $INSTANCE_ID"
echo ""

# Check services
echo "Service Status:"
echo "--------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|openbb"
echo ""

# Check port accessibility
echo "Port Accessibility (Local):"
echo "--------------------------"
for port in 80 3000 8000; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$port | grep -q "200\|302"; then
        echo "✓ Port $port: Accessible locally"
    else
        echo "✗ Port $port: Not accessible locally"
    fi
done
echo ""

# Test endpoints
echo "API Endpoints (Local):"
echo "---------------------"
curl -s http://localhost:8000/api/v1/equity/price/quote?symbol=AAPL | grep -q "success" && echo "✓ Backend API: Working" || echo "✗ Backend API: Failed"
curl -s http://localhost:3000/ | grep -q "<!doctype html>" && echo "✓ Frontend: Working" || echo "✗ Frontend: Failed"
echo ""

# AWS Security Group Instructions
echo "AWS Security Group Configuration Required:"
echo "========================================="
echo "To access OpenBB from outside the EC2 instance, ensure your Security Group has these inbound rules:"
echo ""
echo "1. Frontend Access:"
echo "   - Type: Custom TCP"
echo "   - Port: 3000"
echo "   - Source: 0.0.0.0/0 (or your IP for security)"
echo ""
echo "2. Backend API Access:"
echo "   - Type: Custom TCP"
echo "   - Port: 8000"
echo "   - Source: 0.0.0.0/0 (or your IP for security)"
echo ""
echo "3. SSH Access (already configured):"
echo "   - Type: SSH"
echo "   - Port: 22"
echo "   - Source: Your IP"
echo ""
echo "To add these rules:"
echo "1. Go to AWS EC2 Console"
echo "2. Select your instance"
echo "3. Click on Security tab"
echo "4. Click on the Security Group"
echo "5. Edit inbound rules"
echo "6. Add the rules above"
echo "7. Save"
echo ""
echo "Alternative: Use SSH Port Forwarding"
echo "===================================="
echo "If you cannot modify Security Groups, use SSH tunneling:"
echo ""
echo "ssh -L 3000:localhost:3000 -L 8000:localhost:8000 ubuntu@$PUBLIC_IP"
echo ""
echo "Then access: http://localhost:3000"
echo ""

# Test public accessibility (will fail if Security Group blocks)
echo "Testing Public Accessibility:"
echo "----------------------------"
echo "(These will timeout if Security Group blocks the ports)"
timeout 5 curl -s http://$PUBLIC_IP:3000 >/dev/null 2>&1 && echo "✓ Port 3000: Publicly accessible" || echo "✗ Port 3000: Not publicly accessible (check Security Group)"
timeout 5 curl -s http://$PUBLIC_IP:8000 >/dev/null 2>&1 && echo "✓ Port 8000: Publicly accessible" || echo "✗ Port 8000: Not publicly accessible (check Security Group)"