# OpenAI Integration Setup Guide

## Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (you won't be able to see it again!)

## Step 2: Add API Key to Your Application

### Option A: Using .env file (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Open or create the `.env` file:
   ```bash
   nano .env
   # or
   open .env
   ```

3. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

4. Save the file

### Option B: Export as Environment Variable

```bash
export OPENAI_API_KEY=sk-your-actual-api-key-here
```

## Step 3: Install/Update OpenAI Package

The OpenAI package is already in requirements.txt. If you need to reinstall:

```bash
cd backend
source venv/bin/activate
pip install --upgrade openai
```

## Step 4: Restart the Backend Server

After adding the API key, restart the backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Step 5: Test the Integration

1. Open the application at http://localhost:3000
2. Log in to your account
3. Go to "AI Assistant" in the navigation
4. Ask a question like "Explain binary search algorithm"
5. You should get a real AI response from OpenAI!

## Configuration Options

You can customize the AI model in `backend/ai_assistant.py`:

- `gpt-3.5-turbo` - Fast and cost-effective (default)
- `gpt-4` - More capable but slower and more expensive
- `gpt-4-turbo` - Latest GPT-4 with better performance

Change the model in the `get_ai_response` function:
```python
model="gpt-4-turbo",  # Change this line
```

## Troubleshooting

### "OpenAI API key not configured" message
- Make sure you've added `OPENAI_API_KEY` to your `.env` file
- Restart the backend server after adding the key
- Check that the `.env` file is in the `backend/` directory

### "OpenAI library not installed"
- Run: `pip install --upgrade openai`
- Make sure you're in the virtual environment

### API Errors
- Verify your API key is correct
- Check your OpenAI account has credits/billing set up
- Check the OpenAI status page: https://status.openai.com/

## Security Notes

⚠️ **Never commit your `.env` file to git!**

The `.env` file is already in `.gitignore` to protect your API key. Never share your API key publicly.

## Cost Information

- GPT-3.5-turbo: ~$0.002 per 1K tokens (very affordable)
- GPT-4: ~$0.03 per 1K tokens (more expensive)
- The app uses max_tokens=500 to keep costs low

Monitor your usage at: https://platform.openai.com/usage

