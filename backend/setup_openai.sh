#!/bin/bash

echo "🔑 OpenAI API Key Setup"
echo ""
echo "Please enter your OpenAI API key:"
echo "(You can get it from https://platform.openai.com/api-keys)"
echo ""
read -p "API Key: " api_key

if [ -z "$api_key" ]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

# Update .env file
cd "$(dirname "$0")"

if [ ! -f .env ]; then
    echo "DATABASE_URL=sqlite:///./study_planner.db" > .env
    echo "SECRET_KEY=your-secret-key-change-in-production" >> .env
fi

# Update or add OPENAI_API_KEY
if grep -q "OPENAI_API_KEY" .env; then
    # Replace existing key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$api_key|" .env
    else
        # Linux
        sed -i "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$api_key|" .env
    fi
else
    # Add new key
    echo "OPENAI_API_KEY=$api_key" >> .env
fi

echo ""
echo "✅ API key has been added to .env file"
echo ""
echo "⚠️  Important: Restart your backend server for changes to take effect!"
echo "   Run: pkill -f uvicorn && cd backend && source venv/bin/activate && uvicorn main:app --reload"

