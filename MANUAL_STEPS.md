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

**What is Render?** Render hosts your **backend server** (the Python/Flask app) - **EFFECTIVELY UNLIMITED, NO CREDIT CARD!**
  - **750 hours/month** = More than a full month (744 hours)!
  - **No credit card required** = Sign up and deploy immediately!
  - **Resets every month** = Can run continuously forever!
  - **Auto-wake** = Wakes in ~30 seconds if inactive
  - This IS effectively unlimited for most apps!

**What is Neon?** Neon hosts your **database** (PostgreSQL where all your data is stored) - **TRULY UNLIMITED!**

**Why both?**
- Render = Runs your backend code (750 hrs/mo = effectively unlimited, no credit card!)
- Neon = Stores your database data (truly unlimited storage & connections)
- They work together! Your backend (Render) connects to your database (Neon).

1. **Sign up at Render**: https://render.com
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

## ✅ Step 3: Create Neon Database (5 minutes)

**What is Neon?** Neon hosts your **PostgreSQL database** with truly unlimited storage!

**Important**: Neon is ONLY for the database. Render (from Step 2) runs your backend server.

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

**Important**: The app MUST have DATABASE_URL set to connect to your Neon database!

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
   - **Value**: Your Render URL from Step 2 (e.g., `https://friendly-friends-backend.onrender.com`)
   - Make sure to include `https://` but NO trailing slash `/`
   - Click **"Add secret"**

3. **Verify Secret Added**:
   - You should see `VITE_API_URL` in your secrets list
   - Secret is now encrypted and stored securely

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
   - **Note**: First request might take ~30 seconds if app was sleeping (this is normal for free tier)

5. **Test Database Connection**:
   - Go to Neon dashboard
   - Click **"SQL Editor"**
   - After your first request to the backend, tables should be created automatically
   - You can verify tables exist by running: `SELECT * FROM information_schema.tables;`

---

## ✅ Step 7: Create Temporary Admin User (Automatic)

**This happens automatically on first deployment!**

After your backend starts for the first time, the app automatically creates a temporary admin user:

### Default Admin Credentials (Temporary - Delete Later!)

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@example.com`

⚠️ **IMPORTANT**: This is a **temporary** admin user! You should delete it and create your own admin user later.

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

**Once you've created your own admin user**, delete the temporary one:

1. Go to Neon dashboard → **SQL Editor**
2. Run this query:
   ```sql
   DELETE FROM users WHERE username = 'admin' AND email = 'admin@example.com';
   ```

**Or create your own admin first**:

1. **Create your user** through the app UI (register/login)
2. **Make yourself admin** via SQL:
   ```sql
   UPDATE users SET is_admin = true WHERE username = 'your-username';
   ```
3. **Then delete temporary admin**:
   ```sql
   DELETE FROM users WHERE username = 'admin';
   ```

---

## ✅ Step 8: Initialize Database (Automatic)

**This happens automatically!**

- When your backend starts for the first time
- Flask app automatically creates all database tables
- Temporary admin user is created automatically
- **Neon creates a NEW empty database** - your tables will be empty initially

**To verify it worked**:
1. Make a request to your backend (visit frontend and login with admin/admin123)
2. Go to Neon dashboard → **SQL Editor**
3. Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
4. You should see all your tables (users, videos, blogs, etc.)
5. Run: `SELECT username, is_admin FROM users;` - you should see the admin user

---

## ✅ Step 8: Clone Your Local Database to Neon (Optional - If You Want Existing Data)

**This step copies your existing local database data to Neon!**

If you want to keep your existing users, videos, blogs, and other data, follow these steps:

### Step 8a: Export Your Local Database

1. **Find your local database file**:
   - Common locations:
     - `backend/instance/friendly_friends.db`
     - Or in your Google Drive folder
   - Or run this to find it:
     ```bash
     find ~/Documents/Friendly\ Friends\ App -name "*.db" -type f
     ```

2. **Export to JSON** (on your Mac):
   ```bash
   cd "~/Documents/Friendly Friends App/backend"
   python migrate_database.py export
   ```
   
   Or specify the database path:
   ```bash
   python migrate_database.py export --database-path "/path/to/friendly_friends.db"
   ```

   This creates `database_export.json` with all your data.

### Step 8b: Import to Neon

1. **Get your Neon connection string** (from Step 3)

2. **Import to Neon**:
   ```bash
   cd "~/Documents/Friendly Friends App/backend"
   python migrate_database.py import --database-url "your-neon-connection-string-here"
   ```

   Or set environment variable first:
   ```bash
   export DATABASE_URL="your-neon-connection-string-here"
   python migrate_database.py import
   ```

3. **Verify import**:
   - Go to Neon dashboard → **SQL Editor**
   - Run: `SELECT COUNT(*) FROM users;`
   - Should show your user count
   - Check other tables: `SELECT COUNT(*) FROM videos;`, etc.

**That's it!** Your local database is now cloned to Neon! 🎉

**Note**: If you don't have existing data or want to start fresh, you can skip this step.

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

