# Troubleshooting Guide

## Safari Can't Connect to Server

If Safari can't connect to the server, follow these steps:

### 1. Verify Both Servers Are Running

Run the check script:
```bash
./check_servers.sh
```

Or manually check:
```bash
# Check backend (port 8000)
curl http://127.0.0.1:8000/

# Check frontend (port 3000)  
curl http://127.0.0.1:3000/
```

### 2. Start Servers Manually

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Access the Application

Once both servers are running, open Safari and go to:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### 4. Common Issues

#### Issue: "Safari can't connect to server"
- **Solution:** Make sure both servers are actually running (check with `./check_servers.sh`)
- Try `http://127.0.0.1:3000` instead of `http://localhost:3000`
- Check if port 3000 or 8000 is already in use: `lsof -i :3000 -i :8000`

#### Issue: Backend not starting
- **Solution:** Install missing dependencies:
  ```bash
  cd backend
  source venv/bin/activate
  pip install -r requirements.txt
  ```

#### Issue: Frontend not starting
- **Solution:** Install dependencies:
  ```bash
  cd frontend
  npm install --ignore-scripts
  ```

#### Issue: CORS errors in browser console
- **Solution:** The backend CORS is configured to allow `localhost:3000` and `127.0.0.1:3000`. If you see CORS errors, make sure you're accessing via one of these URLs.

### 5. Restart Everything

If nothing works, restart both servers:

```bash
# Kill existing servers
pkill -f uvicorn
pkill -f vite

# Then start them again (see step 2)
```

### 6. Check Firewall

On macOS, make sure your firewall isn't blocking localhost connections:
- System Settings → Network → Firewall
- Make sure it's not blocking local connections

### 7. Verify Database

The app uses SQLite by default. The database file will be created automatically at:
```
backend/study_planner.db
```

If you see database errors, delete this file and restart the backend (it will recreate it).

