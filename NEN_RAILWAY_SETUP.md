# Neon Database + Railway Setup Guide

Complete step-by-step guide to deploy with Neon (database) + Railway (backend).

---

## ✅ Step 1: Enable GitHub Pages (2 minutes)

1. Go to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/pages
2. Under **"Source"** section:
   - Select **"GitHub Actions"** (not "Deploy from a branch")
3. Click **Save**
4. ✅ Done! Frontend deploys automatically on every push to `main`

**Result**: Your frontend will be available at: `https://mridultyagi687.github.io/friendly-friends-app-full`

---

## ✅ Step 2: Create Neon Database (5 minutes)

**What is Neon?** Neon hosts your **PostgreSQL database** with truly unlimited storage!

1. **Sign up at Neon**: https://neon.tech
   - Click **"Start Free"** or **"Sign Up"**
   - Click **"Continue with GitHub"**
   - Authorize Neon to access your GitHub account

2. **Create New Project**:
   - Click **"Create Project"** (or **"New Project"**)
   - **Project name**: `friendly-friends-app`
   - **Region**: Choose closest to you (or choose same region as Railway for best performance)
   - **PostgreSQL version**: Latest (16+) - default is fine
   - Click **"Create Project"**

3. **Wait for Project Creation** (takes ~30 seconds)

4. **Get Database Connection String**:
   - After project creation, Neon will show your connection string
   - OR go to **Dashboard** → **Connection Details**
   - Look for **"Connection string"** or **"Connection URI"**
   - It looks like: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`
   - **IMPORTANT**: Copy the full connection string (with password included)
   - Click **"Copy"** button or select and copy manually

5. **Save the Connection String**:
   - Keep it safe - you'll need it in Step 4
   - It contains your database password!

**Result**: You now have an unlimited PostgreSQL database at Neon

---

## ✅ Step 3: Connect Railway to GitHub (5 minutes)

**What is Railway?** Railway hosts your **backend server** (the Python/Flask app) - effectively unlimited!

1. **Sign up at Railway**: https://railway.app
   - Click **"Start a New Project"** or **"Login"**
   - Click **"Login with GitHub"**
   - Authorize Railway to access your GitHub account (OAuth)

2. **Create New Project**:
   - Click **"New Project"** (or **"Start a New Project"**)
   - Select **"Deploy from GitHub repo"**
   - Find your repository: `friendly-friends-app-full`
   - Click **"Deploy Now"**

3. **Railway Auto-Detects Configuration**:
   - Railway will automatically detect `railway.json` in your repo
   - It will automatically configure build and start commands
   - Railway uses NIXPACKS to detect Python app
   - This takes 2-5 minutes

4. **Get Your Railway URL**:
   - Once deployed, Railway will show you a URL like: `https://your-app-name.up.railway.app`
   - Copy this URL - you'll need it in Step 5
   - Or go to **Settings** → **Networking** → **Generate Domain** to see your URL

**Result**: Your backend server will be live at: `https://your-app-name.up.railway.app`

---

## ✅ Step 4: Configure Railway Environment Variables (10 minutes)

**⚠️ CRITICAL: This MUST be done for your app to work!**

**This connects your Railway backend to your Neon database!**

1. **Go to Railway Dashboard**:
   - Navigate to your project: https://railway.app/dashboard
   - Click on your service (should be `friendly-friends-app-full` or similar)

2. **Open Variables Tab**:
   - Click on **"Variables"** tab (or **"Environment"** → **"Variables"**)
   - This is where you'll add all environment variables

3. **Add Database Connection** (MOST CRITICAL - REQUIRED!):
   - Click **"+ New Variable"** or **"Add Variable"**
   - **Key**: `DATABASE_URL`
   - **Value**: Paste your Neon connection string from Step 2
   - **⚠️ WARNING**: Without this, your app won't be able to connect to the database!
   - Click **"Add"** or **"Save"**

4. **Add Application Settings**:
   Click **"+ New Variable"** for each of these:

   - **Key**: `FLASK_ENV`  
     **Value**: `production`
   
   - **Key**: `APP_ENV`  
     **Value**: `production`
   
   - **Key**: `SESSION_COOKIE_SECURE`  
     **Value**: `true`
   
   - **Key**: `FRONTEND_URL`  
     **Value**: `https://mridultyagi687.github.io/friendly-friends-app-full`

5. **Generate Secret Key**:
   - **Key**: `FLASK_SECRET_KEY`
   - **Value**: Click **"Generate"** button in Railway (if available)
   - OR generate one yourself:
     ```bash
     openssl rand -hex 32
     ```
   - OR use any random string generator online

6. **Add OpenAI Key** (if using AI features):
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (if you have one)

7. **Save All Variables**:
   - Railway will automatically save each variable as you add it
   - Railway will automatically redeploy when you add variables

**Result**: Your backend is configured with all necessary environment variables

---

## ✅ Step 5: Set GitHub Secret for Frontend (3 minutes)

1. **Go to GitHub Repository Settings**:
   - Navigate to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/secrets/actions

2. **Add New Secret**:
   - Click **"New repository secret"**
   - **Name**: `VITE_API_URL`
   - **Value**: Your Railway URL from Step 3 (e.g., `https://your-app-name.up.railway.app`)
   - Make sure to include `https://` but NO trailing slash `/`
   - Click **"Add secret"**

3. **Verify Secret Added**:
   - You should see `VITE_API_URL` in your secrets list
   - Secret is now encrypted and stored securely

**Result**: Frontend build will now use the correct backend URL

---

## ✅ Step 6: Verify Everything Works (5 minutes)

1. **Check Railway Deployment**:
   - Go to Railway dashboard
   - Check **"Deployments"** tab
   - Make sure latest deployment shows **"Success"** or **"Active"**
   - Check **"Deployments"** → **"View Logs"** for any errors

2. **Check Frontend Deployment**:
   - Go to: https://github.com/mridultyagi687/friendly-friends-app-full/actions
   - Find the latest **"Deploy to GitHub Pages"** workflow
   - Make sure it completed successfully

3. **Test Your Frontend**:
   - Visit: https://mridultyagi687.github.io/friendly-friends-app-full
   - Page should load

4. **Test Your Backend**:
   - Visit: `https://your-railway-url.up.railway.app/api/health` (or `/api/me`)
   - Should return JSON response

5. **Test Database Connection**:
   - Go to Neon dashboard
   - Click **"SQL Editor"**
   - After your first request to the backend, tables should be created automatically
   - You can verify tables exist by running: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

---

## ✅ Step 7: Create Temporary Admin User (2 minutes)

**After your first deployment, the app automatically creates a temporary admin user.**

### Default Admin Credentials

The app automatically creates this admin user on first run:

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@example.com`

⚠️ **IMPORTANT**: This is a temporary admin user! You should delete it and create your own admin user later.

### Access Your App

1. **Visit your frontend**: https://mridultyagi687.github.io/friendly-friends-app-full
2. **Login with**:
   - Username: `admin`
   - Password: `admin123`

### Verify Admin User Exists

1. Go to Neon dashboard → **SQL Editor**
2. Run this query:
   ```sql
   SELECT id, username, email, is_admin FROM users WHERE username = 'admin';
   ```
3. You should see the admin user listed

### Delete Temporary Admin (After Creating Your Own)

Once you've created your own admin user through the app:

1. Go to Neon dashboard → **SQL Editor**
2. Run this query to delete the temporary admin:
   ```sql
   DELETE FROM users WHERE username = 'admin' AND email = 'admin@example.com';
   ```

**Or create your own admin first**, then delete the temporary one:

1. **Create your admin user** through the app UI (register/login)
2. **Make yourself admin** via SQL:
   ```sql
   UPDATE users SET is_admin = true WHERE username = 'your-username';
   ```
3. **Delete temporary admin**:
   ```sql
   DELETE FROM users WHERE username = 'admin';
   ```

---

## ✅ Step 8: Initialize Database (Automatic)

**This happens automatically!**

- When your backend starts for the first time
- Flask app automatically creates all database tables
- **Neon creates a NEW empty database** - your tables will be empty initially
- Temporary admin user is created automatically

**To verify it worked**:
1. Make a request to your backend (visit frontend and login)
2. Go to Neon dashboard → **SQL Editor**
3. Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
4. You should see all your tables (users, videos, blogs, etc.)

---

## 📋 Quick Checklist

- [ ] Step 1: Enabled GitHub Pages (Source: GitHub Actions)
- [ ] Step 2: Created Neon database and copied connection string
- [ ] Step 3: Connected Railway to GitHub repo
- [ ] Step 4: Added all environment variables to Railway:
  - [ ] `DATABASE_URL` (Neon connection string) ⚠️ REQUIRED
  - [ ] `FLASK_ENV=production`
  - [ ] `APP_ENV=production`
  - [ ] `SESSION_COOKIE_SECURE=true`
  - [ ] `FRONTEND_URL=https://mridultyagi687.github.io/friendly-friends-app-full`
  - [ ] `FLASK_SECRET_KEY` (generated)
  - [ ] `OPENAI_API_KEY` (if using AI)
- [ ] Step 5: Added `VITE_API_URL` secret to GitHub
- [ ] Step 6: Verified deployments work
- [ ] Step 7: Logged in with temporary admin (admin/admin123)
- [ ] Step 8: Database initialized automatically

---

## 🆘 Troubleshooting

### Railway Deployment Failing?
- Check Railway **Deployments** → **View Logs** for errors
- Verify all environment variables are set correctly
- Make sure `DATABASE_URL` is set (most common issue!)
- Check if `railway.json` is detected

### Database Connection Errors?
- Verify `DATABASE_URL` in Railway matches Neon connection string exactly
- Check Neon dashboard - is project active?
- Ensure connection string includes password

### Frontend Can't Connect to Backend?
- Verify `VITE_API_URL` secret is set correctly in GitHub
- Check CORS settings in `backend/app.py`
- Ensure `FRONTEND_URL` matches your GitHub Pages URL exactly

### Admin User Not Created?
- Check Railway logs for initialization errors
- Verify Flask app can connect to database
- Check Neon logs in dashboard
- Try making a request to your backend API

---

## 🎉 That's It!

Once all steps are complete:
- ✅ Frontend: https://mridultyagi687.github.io/friendly-friends-app-full
- ✅ Backend: https://your-railway-url.up.railway.app
- ✅ Database: Neon PostgreSQL (truly unlimited)
- ✅ Admin: Temporary admin user (admin/admin123) - delete after creating your own!

**Your app is now live!** 🚀

**Remember**: Delete the temporary admin user (`admin`/`admin123`) after you create your own admin account!

