# Fly.io + Neon Setup (Truly Unlimited Free Tier!)

Complete step-by-step guide to deploy with Fly.io (backend) + Neon (database).

## Why Fly.io?

✅ **3 Free VMs** - Always running, no spin-down  
✅ **No Time Limits** - Run 24/7 forever  
✅ **No Usage Limits** - Unlimited requests  
✅ **Direct GitHub Integration** - No secrets needed  
✅ **Always Available** - No cold starts  

**Fly.io gives you 3 free VMs that run continuously - truly unlimited for most apps!**

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

## ✅ Step 3: Set Up Fly.io (10 minutes)

**What is Fly.io?** Fly.io hosts your **backend server** with 3 free VMs that run 24/7!

1. **Sign up at Fly.io**: https://fly.io
   - Click **"Sign Up"** or **"Get Started"**
   - Click **"Sign in with GitHub"**
   - Authorize Fly.io to access your GitHub account

2. **Install Fly.io CLI** (on your Mac):
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
   
   Or using Homebrew:
   ```bash
   brew install flyctl
   ```

3. **Login to Fly.io**:
   ```bash
   flyctl auth login
   ```
   - This will open your browser to authorize

4. **Create Fly.io App**:
   ```bash
   cd "/Users/mridul/Documents/Friendly Friends App"
   flyctl launch --name friendly-friends-backend
   ```
   
   **OR** if app already exists, just deploy:
   ```bash
   flyctl deploy
   ```

5. **Get Your Fly.io URL**:
   - After deployment, Fly.io will show you a URL like: `https://friendly-friends-backend.fly.dev`
   - Copy this URL - you'll need it in Step 5

**Result**: Your backend server will be live at: `https://friendly-friends-backend.fly.dev`

---

## ✅ Step 4: Configure Fly.io Environment Variables (10 minutes)

**⚠️ CRITICAL: This MUST be done for your app to work!**

**This connects your Fly.io backend to your Neon database!**

1. **Set Database Connection** (MOST CRITICAL - REQUIRED!):
   ```bash
   flyctl secrets set DATABASE_URL="your-neon-connection-string-here"
   ```
   
   Replace `your-neon-connection-string-here` with your Neon connection string from Step 2.

2. **Set Other Environment Variables**:
   ```bash
   flyctl secrets set FLASK_ENV=production
   flyctl secrets set APP_ENV=production
   flyctl secrets set SESSION_COOKIE_SECURE=true
   flyctl secrets set FRONTEND_URL=https://mridultyagi687.github.io/friendly-friends-app-full
   ```

3. **Generate and Set Secret Key**:
   ```bash
   # Generate a secret key
   openssl rand -hex 32
   
   # Set it (replace with the generated key)
   flyctl secrets set FLASK_SECRET_KEY="your-generated-key-here"
   ```

4. **Set OpenAI Key** (if using AI features):
   ```bash
   flyctl secrets set OPENAI_API_KEY="your-openai-key-here"
   ```

5. **Verify Secrets**:
   ```bash
   flyctl secrets list
   ```

**Result**: Your backend is configured with all necessary environment variables

---

## ✅ Step 5: Set GitHub Secret for Frontend (3 minutes)

1. **Go to GitHub Repository Settings**:
   - Navigate to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/secrets/actions

2. **Add New Secret**:
   - Click **"New repository secret"**
   - **Name**: `VITE_API_URL`
   - **Value**: Your Fly.io URL from Step 3 (e.g., `https://friendly-friends-backend.fly.dev`)
   - Make sure to include `https://` but NO trailing slash `/`
   - Click **"Add secret"**

3. **Verify Secret Added**:
   - You should see `VITE_API_URL` in your secrets list

**Result**: Frontend build will now use the correct backend URL

---

## ✅ Step 6: Verify Everything Works (5 minutes)

1. **Check Fly.io Deployment**:
   ```bash
   flyctl status
   flyctl logs
   ```
   - Make sure app shows as "running"

2. **Check Frontend Deployment**:
   - Go to: https://github.com/mridultyagi687/friendly-friends-app-full/actions
   - Find the latest **"Deploy to GitHub Pages"** workflow
   - Make sure it completed successfully

3. **Test Your Frontend**:
   - Visit: https://mridultyagi687.github.io/friendly-friends-app-full
   - Page should load

4. **Test Your Backend**:
   - Visit: `https://friendly-friends-backend.fly.dev/api/health` (or `/api/me`)
   - Should return JSON response

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
- [ ] Step 3: Installed Fly.io CLI and created app
- [ ] Step 4: Set all environment variables in Fly.io:
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

### Fly.io Deployment Failing?
- Check logs: `flyctl logs`
- Verify Dockerfile exists in `backend/` directory
- Check `fly.toml` configuration
- Ensure all secrets are set: `flyctl secrets list`

### Database Connection Errors?
- Verify `DATABASE_URL` secret is set correctly: `flyctl secrets list`
- Check Neon dashboard - is project active?
- Ensure connection string includes password

### Frontend Can't Connect to Backend?
- Verify `VITE_API_URL` secret is set correctly in GitHub
- Check CORS settings in `backend/app.py`
- Ensure `FRONTEND_URL` matches your GitHub Pages URL exactly

---

## 🎉 That's It!

Once all steps are complete:
- ✅ Frontend: https://mridultyagi687.github.io/friendly-friends-app-full
- ✅ Backend: https://friendly-friends-backend.fly.dev
- ✅ Database: Neon PostgreSQL (truly unlimited)
- ✅ Admin: Temporary admin user (admin/admin123) - delete after creating your own!

**Your app is now live with truly unlimited free tier!** 🚀

---

## Fly.io Free Tier Benefits

✅ **3 Free VMs** - Always running  
✅ **No Time Limits** - Run 24/7 forever  
✅ **No Request Limits** - Unlimited API calls  
✅ **No Spin-Down** - Always available  
✅ **256MB RAM per VM** - Plenty for most apps  
✅ **Free Forever** - No credit card required  

**This is truly unlimited for most applications!**

