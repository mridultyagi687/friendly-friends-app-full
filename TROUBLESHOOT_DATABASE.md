# Troubleshoot Database Connection Errors

## Error: "Database error. Please try again" + 401/500 Errors

This means your Render backend can't connect to your Neon database.

---

## 🔍 Step 1: Check Render Logs (Most Important!)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on your service**: `friendly-friends-backend`
3. **Click "Logs" tab**
4. **Look for errors** like:
   - `psycopg2.OperationalError`
   - `could not connect to server`
   - `DATABASE_URL` not found
   - `KeyError: 'DATABASE_URL'`

**Copy the exact error message** - this will tell us what's wrong!

---

## ✅ Step 2: Verify DATABASE_URL is Set in Render

1. **Go to Render Dashboard** → Your service
2. **Click "Environment" tab**
3. **Scroll to "Environment Variables"**
4. **Check if `DATABASE_URL` exists**:
   - ✅ Should see `DATABASE_URL` in the list
   - ❌ If missing, that's the problem!

### If DATABASE_URL is Missing:

1. **Get your Neon connection string**:
   - Go to Neon dashboard: https://console.neon.tech
   - Click your project
   - Go to **"Connection Details"** or **"Dashboard"**
   - Copy the **"Connection string"** (full URI with password)

2. **Add to Render**:
   - In Render → Environment tab
   - Click **"+ Add Environment Variable"**
   - **Key**: `DATABASE_URL`
   - **Value**: Paste your Neon connection string
   - Click **"Save Changes"**
   - Render will auto-redeploy

---

## ✅ Step 3: Verify Connection String Format

Your Neon connection string should look like:
```
postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

**Important checks**:
- ✅ Starts with `postgresql://` (not `postgres://`)
- ✅ Includes password
- ✅ Includes `?sslmode=require` at the end
- ✅ No extra spaces or quotes

### Fix Connection String Format:

If your connection string starts with `postgres://`, change it to `postgresql://`:
```
# Wrong:
postgres://user:password@host/db

# Correct:
postgresql://user:password@host/db
```

---

## ✅ Step 4: Test Database Connection

1. **Go to Neon Dashboard** → SQL Editor
2. **Run this query**:
   ```sql
   SELECT version();
   ```
3. **Should return**: PostgreSQL version info
4. **If error**: Your Neon database might be paused or inactive

### Check if Neon Database is Active:

- Go to Neon dashboard
- Your project should show as **"Active"** (not paused)
- If paused, click **"Resume"** or **"Wake"**

---

## ✅ Step 5: Check Render Logs for Specific Errors

After adding/updating DATABASE_URL, check Render logs again:

### Common Errors & Fixes:

**Error: `psycopg2.OperationalError: could not connect to server`**
- **Fix**: Check connection string format
- **Fix**: Verify Neon database is active
- **Fix**: Check if password is correct

**Error: `KeyError: 'DATABASE_URL'`**
- **Fix**: DATABASE_URL not set in Render
- **Fix**: Add it in Environment tab

**Error: `relation "users" does not exist`**
- **Fix**: Database tables not created yet
- **Fix**: Make a request to your backend - it will auto-create tables
- **Fix**: Or check Render logs for table creation errors

**Error: `password authentication failed`**
- **Fix**: Connection string password is wrong
- **Fix**: Get fresh connection string from Neon dashboard

---

## ✅ Step 6: Force Redeploy After Fixing

After adding/updating `DATABASE_URL`:

1. **Render auto-redeploys** (wait 2-3 minutes)
2. **OR manually redeploy**:
   - Render dashboard → Your service
   - Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## ✅ Step 7: Verify Tables Are Created

1. **Go to Neon Dashboard** → SQL Editor
2. **Run**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
3. **Should see**: users, videos, blogs, etc.
4. **If empty**: Tables not created yet - check Render logs for errors

---

## 🔧 Quick Fix Checklist

- [ ] Check Render logs for exact error
- [ ] Verify `DATABASE_URL` exists in Render Environment tab
- [ ] Verify connection string format (postgresql:// not postgres://)
- [ ] Verify Neon database is active (not paused)
- [ ] Copy fresh connection string from Neon dashboard
- [ ] Add/update `DATABASE_URL` in Render
- [ ] Wait for Render to redeploy (2-3 minutes)
- [ ] Check Render logs again for new errors
- [ ] Test backend: `https://your-app.onrender.com/api/health`

---

## 🎯 Most Common Fix

**90% of the time, the issue is:**

1. `DATABASE_URL` not set in Render Environment variables
2. OR connection string format is wrong

**Quick fix:**
1. Get connection string from Neon dashboard
2. Add `DATABASE_URL` in Render → Environment tab
3. Wait for redeploy
4. Test again

---

## 📞 Still Not Working?

If you've tried everything above, share:
1. **Exact error from Render logs** (copy/paste)
2. **Screenshot of Render Environment variables** (hide sensitive values)
3. **Neon dashboard status** (is database active?)

This will help identify the specific issue!

