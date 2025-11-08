#!/bin/bash

echo "🔍 Checking server status..."
echo ""

echo "Backend (port 8000):"
if lsof -i :8000 > /dev/null 2>&1; then
    echo "✅ Backend is running"
    curl -s http://127.0.0.1:8000/ | head -1
    echo ""
else
    echo "❌ Backend is NOT running"
    echo "   Start it with: cd backend && source venv/bin/activate && uvicorn main:app --reload"
fi

echo ""
echo "Frontend (port 3000):"
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running"
    echo "   Open http://localhost:3000 in Safari"
else
    echo "❌ Frontend is NOT running"
    echo "   Start it with: cd frontend && npm run dev"
fi

echo ""
echo "📝 To start both servers:"
echo "   Terminal 1: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "   Then open http://localhost:3000 in Safari"

