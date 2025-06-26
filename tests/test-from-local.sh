#!/bin/bash

# Test script to run from your LOCAL machine to diagnose connectivity issues

echo "OpenBB Connectivity Test from Local Machine"
echo "=========================================="
echo ""

EC2_IP="100.26.54.124"

echo "1. Testing basic connectivity to EC2 instance:"
ping -c 1 $EC2_IP >/dev/null 2>&1 && echo "✓ Can reach EC2 instance" || echo "✗ Cannot reach EC2 instance"
echo ""

echo "2. Testing port accessibility:"
echo -n "Port 22 (SSH): "
timeout 2 bash -c "echo >/dev/tcp/$EC2_IP/22" 2>/dev/null && echo "✓ Open" || echo "✗ Blocked"

echo -n "Port 3000 (Frontend): "
timeout 2 bash -c "echo >/dev/tcp/$EC2_IP/3000" 2>/dev/null && echo "✓ Open" || echo "✗ Blocked"

echo -n "Port 8000 (Backend): "
timeout 2 bash -c "echo >/dev/tcp/$EC2_IP/8000" 2>/dev/null && echo "✓ Open" || echo "✗ Blocked"
echo ""

echo "3. Testing HTTP connectivity:"
echo -n "Frontend HTTP: "
curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://$EC2_IP:3000 2>/dev/null | grep -q "200" && echo "✓ Accessible" || echo "✗ Not accessible"

echo -n "Backend API: "
curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://$EC2_IP:8000/api/v1/health 2>/dev/null | grep -q "404" && echo "✓ Accessible" || echo "✗ Not accessible"
echo ""

echo "4. AWS Security Group Configuration:"
echo "===================================="
echo "If ports 3000 and 8000 show as 'Blocked', you need to:"
echo ""
echo "1. Go to AWS EC2 Console: https://console.aws.amazon.com/ec2/"
echo "2. Find your instance (IP: $EC2_IP)"
echo "3. Click on the Security tab"
echo "4. Click on the Security Group link"
echo "5. Click 'Edit inbound rules'"
echo "6. Add these rules:"
echo ""
echo "   Rule 1 - Frontend:"
echo "   - Type: Custom TCP"
echo "   - Port: 3000"
echo "   - Source: 0.0.0.0/0 (or 'My IP' for better security)"
echo ""
echo "   Rule 2 - Backend:"
echo "   - Type: Custom TCP"
echo "   - Port: 8000"
echo "   - Source: 0.0.0.0/0 (or 'My IP' for better security)"
echo ""
echo "7. Click 'Save rules'"
echo ""
echo "Alternative: Use SSH Port Forwarding"
echo "===================================="
echo "If you cannot modify the Security Group, use this command:"
echo ""
echo "ssh -L 3000:localhost:3000 -L 8000:localhost:8000 ubuntu@$EC2_IP"
echo ""
echo "Then access the app at: http://localhost:3000"