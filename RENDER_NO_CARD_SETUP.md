# Render + Neon Setup (No Credit Card Required!)

Complete step-by-step guide to deploy with Render (backend) + Neon (database).

## Why Render?

✅ **No Credit Card Required** - Sign up and deploy immediately!  
✅ **750 Hours/Month** - More than a full month (744 hours)!  
✅ **Effectively Unlimited** - Resets every month = continuous use!  
✅ **Direct GitHub Integration** - No secrets needed!  
✅ **Auto-Wake** - Wakes in ~30 seconds if inactive  

**750 hours/month = 31 days × 24 hours = 744 hours. You get 750! Effectively unlimited!**

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
   - **No credit card required!**

2. **Create New Project**:
   - Click **"Create Project"** (or **"New Project"**)
   - **Project name**: `friendly-friends-app`
   - **Region**: Choose closest to you
   - **PostgreSQL version**: Latest (16+) - default is fine
   - Click **"Create Project"**

3. **Wait for Project Creation** (takes ~30 seconds)

4. **Get Database Connection String**:
   - After project creation, Neon will show your connection string
   - OR go to **Dashboard** → **Connection Details**
   - Look for **"Connection string"** or **"Connection URI"**
   - It looks like: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`
   - **IMPORTANT**: Copy the full connection string (with password included)
   - Click **"Copy"** button

5. **Save the Connection String**:
   - Keep it safe - you'll need it in Step 4

**Result**: You now have an unlimited PostgreSQL database at Neon

---

## ✅ Step 3: Connect Render to GitHub (5 minutes)

**What is Render?** Render hosts your **backend server** - 750 hours/month, no credit card needed!

1. **Sign up at Render**: https://render.com
   - Click **"Get Started for Free"** or **"Sign Up"**
   - Click **"Continue with GitHub"**
   - Authorize Render to access your GitHub account
   - **No credit card required!**

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
     - **IMPORTANT**: Copy this EXACTLY - no backticks, no extra quotes!
   - **Plan**: Free
   - Click **"Create Web Service"**

4. **Wait for Deployment**:
   - Render will automatically detect `render.yaml` if present
   - It will start building your backend
   - This takes 3-5 minutes

5. **Get Your Render URL**:
   - Once deployed, Render will show you a URL like: `https://friendly-friends-backend.onrender.com`
   - Copy this URL - you'll need it in Step 5

**Result**: Your backend server will be live at: `https://friendly-friends-backend.onrender.com`

---

## ✅ Step 4: Configure Render Environment Variables (10 minutes)

**⚠️ CRITICAL: This MUST be done for your app to work!**

**This connects your Render backend to your Neon database!**

1. **Go to Render Dashboard**:
   - Navigate to your service: https://dashboard.render.com
   - Click on your service: `friendly-friends-backend`

2. **Open Environment Tab**:
   - Click on **"Environment"** tab
   - Scroll down to **"Environment Variables"** section

3. **Add Database Connection** (MOST CRITICAL - REQUIRED!):
   - Click **"+ Add Environment Variable"**
   - **Key**: `DATABASE_URL`
   - **Value**: Paste your Neon connection string from Step 2
   - **⚠️ WARNING**: Without this, your app will crash on startup!
   - Click **"Save Changes"**

4. **Add Application Settings**:
   Click **"+ Add Environment Variable"** for each of these:

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
   - **Value**: Generate one using:
     ```bash
     openssl rand -hex 32
     ```
   - OR use any random string generator online
   - Click **"Save Changes"**

6. **Add OpenAI Key** (if using AI features):
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (if you have one)
   - Click **"Save Changes"**

7. **Render Auto-Redeploys**:
   - Render will automatically redeploy when you add environment variables
   - Wait for deployment to complete

**Result**: Your backend is configured with all necessary environment variables

---

## ✅ Step 5: Set GitHub Secret for Frontend (3 minutes)

1. **Go to GitHub Repository Settings**:
   - Navigate to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/secrets/actions

2. **Add New Secret**:
   - Click **"New repository secret"**
   - **Name**: `VITE_API_URL`
   - **Value**: Your Render URL from Step 3 (e.g., `https://friendly-friends-backend.onrender.com`)
   - Make sure to include `https://` but NO trailing slash `/`
   - Click **"Add secret"**

3. **Verify Secret Added**:
   - You should see `VITE_API_URL` in your secrets list

**Result**: Frontend build will now use the correct backend URL

---

## ✅ Step 6: Verify Everything Works (5 minutes)

1. **Check Render Deployment**:
   - Go to Render dashboard
   - Check **"Events"** or **"Logs"** tab
   - Make sure latest deployment shows **"Live"** or **"Active"**
   - Check logs for any errors

2. **Check Frontend Deployment**:
   - Go to: https://github.com/mridultyagi687/friendly-friends-app-full/actions
   - Find the latest **"Deploy to GitHub Pages"** workflow
   - Make sure it completed successfully

3. **Test Your Frontend**:
   - Visit: https://mridultyagi687.github.io/friendly-friends-app-full
   - Page should load

4. **Test Your Backend**:
   - Visit: `https://friendly-friends-backend.onrender.com/api/health` (or `/api/me`)
   - Should return JSON response
   - **Note**: First request might take ~30 seconds if app was sleeping

5. **Test Database Connection**:
   - Go to Neon dashboard
   - Click **"SQL Editor"**
   - After your first request to the backend, tables should be created automatically
   - You can verify tables exist by running: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

---

## ✅ Step 7: Create Temporary Admin User (Automatic)

**After your first deployment, the app automatically creates a temporary admin user.**

### Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@example.com`

⚠️ **IMPORTANT**: This is a temporary admin user! Delete it after creating your own.

### Access Your App

1. **Visit your frontend**: https://mridultyagi687.github.io/friendly-friends-app-full
2. **Login with**:
   - Username: `admin`
   - Password: `admin123`

### Delete Temporary Admin (After Creating Your Own)

Once you've created your own admin user:

1. Go to Neon dashboard → **SQL Editor**
2. Run this query:
   ```sql
   DELETE FROM users WHERE username = 'admin' AND email = 'admin@example.com';
   ```

---

## 📋 Quick Checklist

- [ ] Step 1: Enabled GitHub Pages (Source: GitHub Actions)
- [ ] Step 2: Created Neon database and copied connection string
- [ ] Step 3: Connected Render to GitHub repo
- [ ] Step 4: Added all environment variables to Render:
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

---

## 🆘 Troubleshooting

### Render Deployment Failing?
- Check Render **Logs** tab for errors
- Verify all environment variables are set correctly
- Make sure `DATABASE_URL` is set (most common issue!)
- Check if `render.yaml` is detected

### Database Connection Errors?
- Verify `DATABASE_URL` in Render matches Neon connection string exactly
- Check Neon dashboard - is project active?
- Ensure connection string includes password

### Frontend Can't Connect to Backend?
- Verify `VITE_API_URL` secret is set correctly in GitHub
- Check CORS settings in `backend/app.py`
- Ensure `FRONTEND_URL` matches your GitHub Pages URL exactly

### App Takes 30 Seconds to Respond?
- This is normal! Render spins down after 15 minutes of inactivity
- First request wakes the app (~30 seconds)
- Subsequent requests are instant
- This is the trade-off for free tier - still effectively unlimited!

---

## 🎉 That's It!

Once all steps are complete:
- ✅ Frontend: https://mridultyagi687.github.io/friendly-friends-app-full
- ✅ Backend: https://friendly-friends-backend.onrender.com
- ✅ Database: Neon PostgreSQL (truly unlimited)
- ✅ Admin: Temporary admin user (admin/admin123) - delete after creating your own!

**Your app is now live - no credit card required!** 🚀

---

## Render Free Tier Benefits

✅ **750 Hours/Month** - More than a full month (744 hours)!  
✅ **No Credit Card** - Sign up and deploy immediately!  
✅ **Auto-Wake** - Wakes in ~30 seconds if inactive  
✅ **Direct GitHub Integration** - No secrets needed  
✅ **Free Forever** - No time limits  

**750 hours/month = Effectively unlimited for most apps!**

