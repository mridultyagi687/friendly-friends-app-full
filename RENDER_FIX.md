# Render Deployment Fix

## Error: Start Command Syntax Issue

The error shows:
```
bash: -c: line 1: unexpected EOF while looking for matching ``'
```

This is caused by an incorrect start command format in Render.

## Fix: Update Start Command in Render Dashboard

1. Go to your Render service dashboard
2. Click on **Settings**
3. Scroll down to **Start Command**
4. **Remove any backticks or special characters**
5. Use this exact command:

```bash
cd backend && gunicorn -w 2 -b 0.0.0.0:$PORT app:app
```

**Important**: 
- No backticks (`)
- No extra quotes
- Just the command exactly as shown above

## Or Use render.yaml

If you have `render.yaml` in your repo root, Render will use those settings automatically. Make sure it has:

```yaml
services:
  - type: web
    name: friendly-friends-backend
    env: python
    buildCommand: cd backend && pip install -r requirements.txt && pip install gunicorn
    startCommand: cd backend && gunicorn -w 2 -b 0.0.0.0:$PORT app:app
```

## Quick Fix Steps

1. **Render Dashboard** → Your Service → **Settings**
2. Find **Start Command** field
3. **Delete everything** in that field
4. **Paste this exactly**:
   ```
   cd backend && gunicorn -w 2 -b 0.0.0.0:$PORT app:app
   ```
5. **Save Changes**
6. Render will automatically redeploy

## Verify

After saving, check the **Logs** tab. You should see:
```
[INFO] Starting gunicorn...
[INFO] Listening at: http://0.0.0.0:XXXX
```

If you still see errors, check the logs for specific error messages.

