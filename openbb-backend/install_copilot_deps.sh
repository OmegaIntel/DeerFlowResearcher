#!/bin/bash

echo "Installing OpenBB Copilot dependencies..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install copilot-specific dependencies
pip install langchain==0.3.13
pip install langchain-openai==0.2.13
pip install langgraph==0.2.60
pip install langchain-community==0.3.13
pip install openai==1.58.1
pip install redis==5.2.1
pip install python-dotenv==1.0.0

echo "Dependencies installed successfully!"

# Copy environment file
if [ -f ".env.copilot" ]; then
    echo "Loading copilot environment variables..."
    export $(cat .env.copilot | grep -v '^#' | xargs)
fi

echo "Setup complete! You can now start the backend with copilot support."