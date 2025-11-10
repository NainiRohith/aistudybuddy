#!/bin/bash

# Start script for Study Planner Application

echo "🚀 Starting Study Planner Application..."

free_port() {
    local port=$1
    local service=$2
    if lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use. Freeing port for $service..."
        local pid=$(lsof -nP -iTCP:$port -sTCP:LISTEN -t 2>/dev/null)
        if [ ! -z "$pid" ]; then
            echo "   Stopping process $pid on port $port..."
            kill -9 $pid 2>/dev/null
            sleep 1
            # Verify port is free
            if lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
                echo "   ⚠️  Process still running, trying alternative method..."
                pkill -f "uvicorn.*$port" 2>/dev/null
                pkill -f "node.*$port" 2>/dev/null
                sleep 1
            fi
            if lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
                echo "❌ Could not free port $port. Please manually stop the process."
                exit 1
            else
                echo "✅ Port $port is now free"
            fi
        fi
    fi
}

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Start backend
echo "📦 Starting backend server..."
free_port 8000 "backend server"
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt --quiet

echo "✅ Backend dependencies installed"
echo "🌐 Starting backend server on http://localhost:8000"
uvicorn main:app --reload &
BACKEND_PID=$!

cd ..

# Start frontend
echo "📦 Starting frontend server..."
free_port 3000 "frontend server"
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo "✅ Frontend dependencies installed"
echo "🌐 Starting frontend server on http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ Application started!"
echo "📚 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
