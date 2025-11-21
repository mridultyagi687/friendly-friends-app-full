Local backend for Friendly Friends — Google OAuth2 + SQLite

Overview
- Small Flask backend that implements Google OAuth2 for local development.
- Stores authenticated users in the local SQLite DB at the same location as your Python script.

Setup
1. Copy `.env.example` to `.env` and fill in values (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FLASK_SECRET_KEY). Ensure `BASE_DIR` points to your DB folder.

2. Create Google OAuth credentials:
   - Visit https://console.cloud.google.com/apis/credentials
   - Create a new OAuth 2.0 Client ID (Application type: Web application)
   - Add an Authorized redirect URI: `http://localhost:5000/auth/callback`
   - Copy the Client ID and Client Secret into your `.env`.

3. Create a virtual environment and install dependencies (PowerShell):
```powershell
cd "C:\Users\Mridul Tyagi\Documents\Friendly Friends App\backend"
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

4. Run backend:
```powershell
$env:FLASK_ENV='development'
python app.py
```

How it works
- GET /login → redirects to Google consent screen.
- Google redirects back to /auth/callback, the backend fetches userinfo and saves or updates the user in the local SQLite DB.
- The backend sets a session cookie; the frontend can call GET /api/me to read the logged-in user (send credentials).

Frontend notes
- The example React frontend can initiate sign-in by directing the browser to `http://localhost:5000/login` (e.g. window.location.href = '/login' or open in popup).
- For dev, Vite runs on port 5173. The backend allows CORS from the frontend URL, and the session cookie is used for subsequent API calls.

Security notes
- This setup is for local development only. Do not use client secrets in client-side code. For production you must use HTTPS and secure cookie settings, validate OAuth tokens, and follow OAuth best practices.
