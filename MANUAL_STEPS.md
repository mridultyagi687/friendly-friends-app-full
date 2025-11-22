# Manual Steps to Deploy Your App

Follow these steps in order to complete the deployment setup.

## ✅ Step 1: Enable GitHub Pages (2 minutes)

1. Go to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/pages
2. Under **"Source"** section:
   - Select **"GitHub Actions"** (not "Deploy from a branch")
3. Click **Save**
4. ✅ Done! Frontend will deploy automatically on every push to `main`

**Result**: Your frontend will be available at: `https://mridultyagi687.github.io/friendly-friends-app-full`

---

## ✅ Step 2: Connect Render to GitHub (5 minutes)

**What is Render?** Render hosts your **backend server** (the Python/Flask app that handles API requests) - FREE with generous limits!

**What is Neon?** Neon hosts your **database** (PostgreSQL where all your data is stored) - TRULY UNLIMITED!

**Why both?**
- Render = Runs your backend code (free tier, generous limits)
- Neon = Stores your database data (truly unlimited storage & connections)
- They work together! Your backend (Render) connects to your database (Neon).

1. **Sign up at Render**: https://render.com
   - Click **"Get Started for Free"** or **"Sign Up"**
   - Click **"Continue with GitHub"**
   - Authorize Render to access your GitHub account

2. **Create New Web Service**:
   - Click **"New +"** → **"Web Service"**
   - Click **"Connect account"** or **"Connect GitHub"** if not already connected
   - Find your repository: `friendly-friends-app-full`
   - Click **"Connect"**

3. **Configure Service**:
   - **Name**: `friendly-friends-backend` (or any name you want)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty (or set to `.` if needed)
   - **Runtime**: Python 3
   - **Build Command**: `cd backend && pip install -r requirements.txt && pip install gunicorn`
   - **Start Command**: `cd backend && gunicorn -w 2 -b 0.0.0.0:$PORT app:app`
   - **Plan**: Free
   - Click **"Create Web Service"**

4. **Wait for Deployment**:
   - Render will automatically detect `render.yaml` if present
   - It will start building your backend
   - This takes 3-5 minutes

5. **Get Your Render URL**:
   - Once deployed, Render will show you a URL like: `https://friendly-friends-backend.onrender.com`
   - Copy this URL - you'll need it in Step 5
   - Or go to **Settings** → **Custom Domains** to see your URL

**Result**: Your backend server will be live at: `https://friendly-friends-backend.onrender.com`

---

## ✅ Step 3: Create Neon Database (5 minutes)

**What is Neon?** Neon hosts your **PostgreSQL database** with truly unlimited storage!

**Important**: Neon is ONLY for the database. Railway (from Step 2) runs your backend server.

1. **Sign up at Neon**: https://neon.tech
   - Click **"Start Free"** or **"Sign Up"**
   - Click **"Continue with GitHub"**
   - Authorize Neon to access your GitHub account

2. **Create New Project**:
   - Click **"Create Project"** (or **"New Project"**)
   - **Project name**: `friendly-friends-app`
   - **Region**: Choose closest to you (or closest to Railway region)
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

**Result**: You now have an unlimited PostgreSQL database at Neon (separate from Railway)

---

## ✅ Step 4: Configure Railway Environment Variables (10 minutes)

**This connects your Railway backend to your Neon database!**

1. **Go to Railway Dashboard**:
   - Navigate to your project: https://railway.app/dashboard
   - Click on your service (should be `friendly-friends-app-full` or similar)

2. **Open Variables Tab**:
   - Click on **"Variables"** tab (or **"Environment"** → **"Variables"**)
   - This is where you'll add all environment variables

3. **Add Database Connection** (MOST IMPORTANT - This connects Railway to Neon!):
   - Click **"+ New Variable"** or **"Add Variable"**
   - **Key**: `DATABASE_URL`
   - **Value**: Paste your Neon connection string from Step 3
   - This tells your Railway backend where to find your Neon database
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
   - OR generate one yourself using:
     - Mac/Linux: `openssl rand -hex 32`
     - Or use any random string generator online

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
   - **Value**: Your Railway URL from Step 2 (e.g., `https://your-app-name.up.railway.app`)
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
   - Check **"Logs"** tab for any errors

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
   - You can verify tables exist by running: `SELECT * FROM information_schema.tables;`

---

## ✅ Step 7: Initialize Database (Automatic)

**This happens automatically!**

- When your backend starts for the first time
- Flask app automatically creates all database tables
- No manual steps needed

**To verify it worked**:
1. Make a request to your backend (visit frontend and login)
2. Go to Neon dashboard → **SQL Editor**
3. Run: `\dt` or `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
4. You should see all your tables (users, videos, blogs, etc.)

---

## 📋 Quick Checklist

- [ ] Step 1: Enabled GitHub Pages (Source: GitHub Actions)
- [ ] Step 2: Connected Railway to GitHub repo
- [ ] Step 3: Created Neon database and copied connection string
- [ ] Step 4: Added all environment variables to Railway:
  - [ ] `DATABASE_URL` (Neon connection string)
  - [ ] `FLASK_ENV=production`
  - [ ] `APP_ENV=production`
  - [ ] `SESSION_COOKIE_SECURE=true`
  - [ ] `FRONTEND_URL=https://mridultyagi687.github.io/friendly-friends-app-full`
  - [ ] `FLASK_SECRET_KEY` (generated)
  - [ ] `OPENAI_API_KEY` (if using AI)
- [ ] Step 5: Added `VITE_API_URL` secret to GitHub
- [ ] Step 6: Verified deployments work
- [ ] Step 7: Database initialized automatically

---

## 🆘 Troubleshooting

### Railway Deployment Failing?
- Check Railway **Logs** tab for errors
- Verify all environment variables are set correctly
- Make sure `railway.json` exists in root directory

### Database Connection Errors?
- Verify `DATABASE_URL` in Railway matches Neon connection string exactly
- Check Neon dashboard - is project active?
- Ensure connection string includes password

### Frontend Can't Connect to Backend?
- Verify `VITE_API_URL` secret is set correctly in GitHub
- Check CORS settings in `backend/app.py`
- Ensure `FRONTEND_URL` matches your GitHub Pages URL exactly

### Need Help?
- Check Railway logs: Railway dashboard → **Logs** tab
- Check GitHub Actions: Repository → **Actions** tab
- Check Neon: Neon dashboard → **SQL Editor** for database queries

---

## 🎉 That's It!

Once all steps are complete:
- ✅ Frontend: https://mridultyagi687.github.io/friendly-friends-app-full
- ✅ Backend: https://your-railway-url.up.railway.app
- ✅ Database: Neon PostgreSQL (truly unlimited)
- ✅ Everything connected via GitHub!

**Your app is now live and unlimited!** 🚀

