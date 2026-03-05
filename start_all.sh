#!/bin/bash


# Kill any process using port 8000 (backend)
BACKEND_PORT=8000
FRONTEND_PORT=3000
echo "Checking for existing process on port $BACKEND_PORT..."
EXISTING_BACKEND_PID=$(lsof -ti tcp:$BACKEND_PORT)
if [ -n "$EXISTING_BACKEND_PID" ]; then
	echo "Killing backend process on port $BACKEND_PORT (PID $EXISTING_BACKEND_PID)"
	kill -9 $EXISTING_BACKEND_PID
fi

# Kill any process using port 3000 (frontend)
echo "Checking for existing process on port $FRONTEND_PORT..."
EXISTING_FRONTEND_PID=$(lsof -ti tcp:$FRONTEND_PORT)
if [ -n "$EXISTING_FRONTEND_PID" ]; then
	echo "Killing frontend process on port $FRONTEND_PORT (PID $EXISTING_FRONTEND_PID)"
	kill -9 $EXISTING_FRONTEND_PID
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

# Start backend (FastAPI/ADK) on port 8000
echo "Starting backend (server_entry.py) on port $BACKEND_PORT..."
/Users/adarsh/Documents/cart-blanche/.venv/bin/uvicorn server.server_entry:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
BACKEND_PID=$!

# Start payment server (payment_server.py) on port 8001
echo "Starting payment server (payment_server.py) on port 8001..."
python3 server/payment_server.py > payment_server.log 2>&1 &
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

echo "Backend PID: $BACKEND_PID"
echo "Payment Server PID: $PAYMENT_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "All servers are starting. Use 'kill $BACKEND_PID $PAYMENT_PID $FRONTEND_PID' to stop them."
