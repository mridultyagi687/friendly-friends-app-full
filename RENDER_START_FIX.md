# Render Start Command Fix

## Issue: Build Successful, But App Exits with Status 2

The build completed successfully, but the app fails to start. This usually means:
1. Missing environment variable (DATABASE_URL not set)
2. Python can't find the app module
3. App crashes during initialization

## Fix Steps

### Step 1: Verify Environment Variables in Render

1. Go to Render Dashboard → Your Service → **Environment**
2. **CRITICAL**: Make sure `DATABASE_URL` is set!
   - If using Neon: Paste your Neon connection string here
   - Format: `postgresql://user:password@host/dbname`
   - **This is REQUIRED** - the app will crash without it!

3. Verify these are set:
   - `DATABASE_URL` = Your Neon connection string ⚠️ **REQUIRED**
   - `FLASK_ENV` = `production`
   - `APP_ENV` = `production`
   - `SESSION_COOKIE_SECURE` = `true`
   - `FRONTEND_URL` = `https://mridultyagi687.github.io/friendly-friends-app-full`
   - `FLASK_SECRET_KEY` = (auto-generated or set manually)

### Step 2: Check Start Command in Render

1. Go to **Settings** → **Start Command**
2. Make sure it's exactly:
   ```
   cd backend && gunicorn -w 2 -b 0.0.0.0:$PORT app:app
   ```
   - No backticks
   - No extra quotes
   - No trailing characters

### Step 3: Try Alternative Start Command

If the above doesn't work, try setting PYTHONPATH explicitly:

1. Go to **Settings** → **Start Command**
2. Use this instead:
   ```
   cd backend && export PYTHONPATH=$PYTHONPATH:$(pwd) && gunicorn -w 2 -b 0.0.0.0:$PORT app:app
   ```

Or try without changing directory first:
```
PYTHONPATH=/opt/render/project/src/backend gunicorn -w 2 -b 0.0.0.0:$PORT --chdir backend app:app
```

### Step 4: Check Logs for Specific Error

1. Go to **Logs** tab in Render
2. Look for the actual error message after "==> Running..."
3. Common errors:
   - `ModuleNotFoundError: No module named 'app'` → Python path issue
   - `psycopg2.OperationalError` → Database connection issue (check DATABASE_URL)
   - `KeyError: 'DATABASE_URL'` → Missing environment variable
   - `Port already in use` → Port conflict

### Step 5: Test Database Connection

The app might be failing because it can't connect to Neon. Verify:

1. **DATABASE_URL** format is correct:
   ```
   postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```

2. Test connection manually (if you have access):
   ```bash
   psql "postgresql://user:password@host.neon.tech/dbname?sslmode=require"
   ```

### Step 6: Simplify Start Command for Debugging

Try a simpler start command to see what's happening:

```
cd backend && python -c "import app; print('App loaded')" && gunicorn -w 1 -b 0.0.0.0:$PORT --timeout 120 app:app
```

This will:
- Test if Python can import the app module
- Use 1 worker (less memory)
- Longer timeout (120 seconds)

### Step 7: Check Python Version Compatibility

Your render.yaml specifies Python 3.11.9, but Render might be using 3.13.4. 

1. In Render Dashboard → **Settings** → **Python Version**
2. Set it to: `3.11` or `3.11.9`
3. Save and redeploy

## Most Common Fix

**90% of the time, the issue is missing `DATABASE_URL`:**

1. Go to Render Dashboard → Environment
2. Add `DATABASE_URL` = Your Neon connection string
3. Save and redeploy

The app requires DATABASE_URL to start - without it, it will crash immediately!

## Quick Checklist

- [ ] `DATABASE_URL` is set in Render environment variables
- [ ] Start command is correct (no backticks, no extra quotes)
- [ ] Python version matches (3.11 or 3.13)
- [ ] Check logs for specific error message
- [ ] Neon database is active (not paused)

After fixing, the app should start successfully! 🚀

