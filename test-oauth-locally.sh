#!/bin/bash
echo "To test OAuth locally, run this command from your LOCAL machine:"
echo ""
echo "ssh -L 3000:localhost:3000 -L 8000:localhost:8000 ubuntu@ec2-54-91-85-225.compute-1.amazonaws.com"
echo ""
echo "Then access the app at: http://localhost:3000"
echo ""
echo "This will tunnel the EC2 ports to your local machine, allowing Google OAuth to work."