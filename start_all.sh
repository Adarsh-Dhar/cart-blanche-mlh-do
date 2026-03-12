#!/bin/bash

# Kill any process using port 8000 (backend)
BACKEND_PORT=8000
FRONTEND_PORT=3000
PAYMENT_PORT=8001

# Kill existing backend process
echo "Checking for existing process on port $BACKEND_PORT..."
EXISTING_BACKEND_PID=$(lsof -ti tcp:$BACKEND_PORT)
if [ -n "$EXISTING_BACKEND_PID" ]; then
    echo "Killing backend process on port $BACKEND_PORT (PID $EXISTING_BACKEND_PID)"
    kill -9 $EXISTING_BACKEND_PID
fi

# Kill existing frontend process
echo "Checking for existing process on port $FRONTEND_PORT..."
EXISTING_FRONTEND_PID=$(lsof -ti tcp:$FRONTEND_PORT)
if [ -n "$EXISTING_FRONTEND_PID" ]; then
    echo "Killing frontend process on port $FRONTEND_PORT (PID $EXISTING_FRONTEND_PID)"
    kill -9 $EXISTING_FRONTEND_PID
fi

# Kill existing payment server process
echo "Checking for existing process on port $PAYMENT_PORT..."
EXISTING_PAYMENT_PID=$(lsof -ti tcp:$PAYMENT_PORT)
if [ -n "$EXISTING_PAYMENT_PID" ]; then
    echo "Killing payment server process on port $PAYMENT_PORT (PID $EXISTING_PAYMENT_PID)"
    kill -9 $EXISTING_PAYMENT_PID
fi

# Remove Next.js dev lock if present
if [ -f frontend/.next/dev/lock ]; then
    echo "Removing Next.js dev lock file..."
    rm -f frontend/.next/dev/lock
fi

# Load environment variables from .env if present
if [ -f .env ]; then
    set -a
    . ./.env
    set +a
fi

# Ensure correct Python venv and npm global bin are in PATH
export PATH="$PATH:$(npm bin -g)"

# Ensure the script runs from the project root directory
cd /Users/adarsh/Documents/cart-blanche-nova-ai

# Start backend (FastAPI/ADK) on port 8000
echo "Starting backend (main.py) on port $BACKEND_PORT..."
/Users/adarsh/Documents/cart-blanche-nova-ai/.venv/bin/uvicorn server.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
BACKEND_PID=$!

# Start payment server (x402_settlement.py) on port $PAYMENT_PORT
echo "Starting payment server (x402_settlement.py) on port $PAYMENT_PORT..."
python3 server/tool/x402_settlement.py > payment_server.log 2>&1 &
PAYMENT_PID=$!

# Start frontend (Next.js) on port 3000
echo "Starting frontend (Next.js) on port $FRONTEND_PORT..."
cd frontend || exit 1
# Check if pnpm is installed
if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm not found. Installing pnpm globally..."
    npm install -g pnpm || { echo "Failed to install pnpm. Exiting."; exit 1; }
fi
pnpm run dev &
FRONTEND_PID=$!
cd ..

# Display process IDs
echo "Backend PID: $BACKEND_PID"
echo "Payment Server PID: $PAYMENT_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "All servers are starting. Use 'kill $BACKEND_PID $PAYMENT_PID $FRONTEND_PID' to stop them."
