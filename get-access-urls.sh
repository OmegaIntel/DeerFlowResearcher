#!/bin/bash

echo "========================================"
echo "OpenBB Access URLs"
echo "========================================"

# Try to get public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "Unable to determine")

if [ "$PUBLIC_IP" != "Unable to determine" ]; then
    echo ""
    echo "Access the application from your browser:"
    echo "  Frontend:    http://$PUBLIC_IP:3000"
    echo "  Backend API: http://$PUBLIC_IP:8000"
    echo "  API Docs:    http://$PUBLIC_IP:8000/docs"
    echo "  MindsDB:     http://$PUBLIC_IP:47334"
    echo "  OnlyOffice:  http://$PUBLIC_IP:9080"
else
    echo ""
    echo "Could not determine public IP."
    echo "If you're on EC2, make sure the security group allows:"
    echo "  - Port 3000 (Frontend)"
    echo "  - Port 8000 (Backend API)"
    echo "  - Port 47334-47335 (MindsDB)"
    echo "  - Port 9080 (OnlyOffice)"
fi

echo ""
echo "Local access (if on the same machine):"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo ""

# Check if services are running
echo "Service Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(openbb|redis|mindsdb|onlyoffice)" || echo "No services found running"