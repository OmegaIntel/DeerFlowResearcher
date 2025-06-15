#!/bin/bash

# Monitor citation-related activity in real-time

echo "Starting citation monitoring..."
echo "Monitoring backend and frontend for citation-related activity"
echo "Logs will be saved to logs/citation-monitor.log"
echo "Press Ctrl+C to stop"
echo ""

# Create log file
LOG_FILE="logs/citation-monitor.log"
echo "[$(date)] Starting citation monitoring" > $LOG_FILE

# Function to monitor backend
monitor_backend() {
    docker logs -f deer-flow-backend 2>&1 | while read line; do
        if [[ $line == *"[RAG"* ]] || [[ $line == *"[Citation"* ]] || [[ $line == *"document-viewer"* ]] || [[ $line == *"markdown links"* ]] || [[ $line == *"LLM response"* ]]; then
            echo "[BACKEND] $line" | tee -a $LOG_FILE
        fi
    done
}

# Function to monitor frontend  
monitor_frontend() {
    docker logs -f deer-flow-frontend 2>&1 | while read line; do
        if [[ $line == *"Citation"* ]] || [[ $line == *"document-viewer"* ]] || [[ $line == *"404"* ]]; then
            echo "[FRONTEND] $line" | tee -a $LOG_FILE
        fi
    done
}

# Run both monitors in parallel
monitor_backend &
BACKEND_PID=$!

monitor_frontend &
FRONTEND_PID=$!

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; echo 'Monitoring stopped'; exit" INT

wait