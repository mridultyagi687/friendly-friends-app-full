# Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. 401 Unauthorized on `/api/me`

**Symptoms:**
- Error: "Failed to load resource: the server responded with a status of 401"
- User gets logged out immediately after login
- Authentication fails on page refresh

**Causes & Solutions:**

#### A. Backend URL Mismatch
- **Problem**: Frontend is configured for wrong backend URL
- **Check**: Verify `frontend/.env.production` has correct URL
- **Fix**: Update to match your deployment URL:
  ```
  VITE_API_URL=https://your-backend-url.onrender.com
  ```

#### B. CORS Configuration
- **Problem**: Backend doesn't allow frontend origin
- **Check**: Look for CORS errors in browser console
- **Fix**: Add your frontend URL to backend CORS origins in `backend/app.py`:
  ```python
  cors_allowed_origins_list = [
      "https://your-frontend-url.com",
      # ... other origins
  ]
  ```

#### C. Session Token Issues
- **Problem**: Invalid or expired session token
- **Fix**: Clear localStorage and login again:
  ```javascript
  localStorage.removeItem('session_token');
  ```

### 2. Failed to Load Resource on Join Requests

**Symptoms:**
- Error: "api/join-requests:1 Failed to load resource when submitting request"

**Causes & Solutions:**

#### A. API Service Not Used
- **Problem**: Direct fetch() instead of configured API service
- **Fix**: Use the api service (already fixed in Login.jsx)

#### B. Network Issues
- **Problem**: Backend not responding or network timeout
- **Check**: Test backend health endpoint directly
- **Fix**: Ensure backend is running and accessible

### 3. Favicon 404 Error

**Symptoms:**
- Error: "favicon.ico:1 Failed to load resource: the server responded with a status of 404"

**Solution:**
- Added favicon.svg to frontend/public/
- Updated index.html with favicon links

## Debugging Steps

### 1. Check Backend Status
```bash
curl https://your-backend-url.onrender.com/
```
Should return JSON with status "ok"

### 2. Test Authentication Endpoint
```bash
curl -X POST https://your-backend-url.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3. Check Browser Network Tab
- Open Developer Tools → Network
- Look for failed requests (red entries)
- Check request/response headers
- Verify CORS headers are present

### 4. Clear Browser Data
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
// Then refresh page
```

### 5. Check Session Token
```javascript
// In browser console
console.log('Session token:', localStorage.getItem('session_token'));
```

## Environment Configuration

### Frontend (.env.production)
```
VITE_API_URL=https://friendly-friends-app-full.onrender.com
```

### Backend (app.py)
Ensure CORS origins include your frontend URL:
```python
cors_allowed_origins_list = [
    "http://localhost:5173",
    "https://mridultyagi687.github.io",
    "https://friendly-friends-app-full.onrender.com",
]
```

## Deployment Checklist

- [ ] Frontend built with correct API URL
- [ ] Backend CORS configured for frontend origin
- [ ] Backend deployed and accessible
- [ ] Database initialized with admin user
- [ ] Session cookies configured for production
- [ ] HTTPS enabled for production

## Quick Fixes Applied

1. ✅ Updated frontend API URL to match Render deployment
2. ✅ Added Render frontend URL to backend CORS origins
3. ✅ Fixed join-requests to use API service instead of direct fetch
4. ✅ Added favicon to prevent 404 errors
5. ✅ Added debugging to authentication context
6. ✅ Improved error handling in auth flow

## Testing the Fixes

1. **Clear browser cache and localStorage**
2. **Try logging in with admin/admin123**
3. **Test join request submission**
4. **Check browser console for remaining errors**

If issues persist, check the browser network tab for specific error details and verify backend logs.