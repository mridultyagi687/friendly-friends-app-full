# GitHub + Railway Setup (No Secrets Needed!)

This guide shows how to deploy using **Railway** with **direct GitHub integration** - no API tokens or secrets required!

## Why Railway?

✅ **Direct GitHub OAuth Integration** - Connect via GitHub login, no API tokens needed  
✅ **Free PostgreSQL Database** - No database limits on free tier  
✅ **Automatic Deployments** - Deploys automatically on every push  
✅ **Free Tier** - $5 free credit monthly (plenty for most apps)  
✅ **No Secrets Needed** - Everything connected via GitHub OAuth

## Architecture

- **Frontend**: GitHub Pages (free, automatic)
- **Backend**: Railway (free tier, connected via GitHub)
- **Database**: Railway PostgreSQL (free tier, no limits)
- **Connection**: Direct GitHub OAuth integration

## Step 1: Enable GitHub Pages (2 minutes)

1. Go to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/pages
2. Under **Source**, select **GitHub Actions**
3. Done! Frontend deploys automatically on push to `main`

## Step 2: Connect Railway to GitHub (5 minutes)

1. **Sign up at Railway**: https://railway.app
   - Click **"Start a New Project"**
   - Select **"Deploy from GitHub repo"**
   - Authorize Railway to access your GitHub account (OAuth)

2. **Select Your Repository**:
   - Find `friendly-friends-app-full`
   - Click **"Deploy Now"**

3. **Railway Auto-Detects Configuration**:
   - Railway will detect `railway.json`
   - It will automatically set up your backend

## Step 3: Add PostgreSQL Database (2 minutes)

1. In Railway dashboard, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway automatically creates and links the database
4. **No configuration needed!** Railway auto-sets `DATABASE_URL` environment variable

## Step 4: Configure Environment Variables (3 minutes)

In Railway dashboard, go to your service → **Variables** tab:

Add these variables:
- `FLASK_ENV=production`
- `APP_ENV=production`
- `SESSION_COOKIE_SECURE=true`
- `FRONTEND_URL=https://mridultyagi687.github.io/friendly-friends-app-full`
- `FLASK_SECRET_KEY` - Click **"Generate"** to create one
- `OPENAI_API_KEY` - Your OpenAI key (if using AI features)

**Important**: Railway automatically sets `DATABASE_URL` - you don't need to add it manually!

## Step 5: Update Frontend API URL (2 minutes)

1. Railway gives you a public URL like: `https://your-app-name.up.railway.app`
2. Copy this URL
3. Go to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/secrets/actions
4. Add secret:
   - Name: `VITE_API_URL`
   - Value: Your Railway URL (e.g., `https://your-app-name.up.railway.app`)

## Step 6: Set Custom Domain (Optional)

In Railway dashboard:
1. Go to your service → **Settings** → **Networking**
2. Click **"Generate Domain"** to get a custom `.railway.app` domain
3. Or add your own custom domain

## How It Works

### Automatic Deployment

1. **Push to GitHub** → Railway automatically detects changes
2. **Railway Builds** → Runs build command from `railway.json`
3. **Railway Deploys** → Starts your backend service
4. **Database Connected** → PostgreSQL automatically linked

### No Secrets Needed!

- **GitHub OAuth**: Railway connects directly via GitHub login
- **Environment Variables**: Set in Railway dashboard (no secrets needed)
- **Database**: Automatically linked via Railway's internal network
- **Deployment**: Automatic on every push to `main`

## Railway Free Tier

✅ **$5 Monthly Credit** - Free tier with generous limits  
✅ **PostgreSQL Database** - Included, no separate cost  
✅ **500 Hours Runtime** - Plenty for most apps  
✅ **100GB Outbound Data** - Included monthly  
✅ **No Credit Card Required** - Free tier available

## Database Information

Railway PostgreSQL:
- **Connection**: Automatic via `DATABASE_URL`
- **No Limits**: Free tier PostgreSQL has generous limits
- **Auto-Backups**: Included automatically
- **Managed**: Fully managed by Railway

## Viewing Logs

1. Go to Railway dashboard
2. Click on your service
3. Click **"View Logs"** tab
4. See real-time logs from your backend

## Troubleshooting

### Backend Not Deploying
- Check Railway dashboard → **Deployments** tab
- Verify GitHub repo is connected
- Check build logs for errors

### Database Connection Issues
- Verify `DATABASE_URL` is set (check in Variables tab)
- Check Railway logs for connection errors
- Ensure PostgreSQL service is running

### Frontend Can't Connect
- Verify `VITE_API_URL` secret is set correctly
- Check CORS settings in `backend/app.py`
- Ensure `FRONTEND_URL` matches your GitHub Pages URL

## All GitHub-Managed!

✅ **Frontend**: GitHub Pages (automatic)  
✅ **Backend**: Railway (connected via GitHub OAuth)  
✅ **Database**: Railway PostgreSQL (auto-linked)  
✅ **Deployment**: Automatic on push to `main`  
✅ **No Secrets**: Everything connected via GitHub!

## Benefits

1. **No API Tokens** - Connect via GitHub OAuth
2. **No Secrets Management** - Environment variables in Railway dashboard
3. **Automatic Deployments** - Push to GitHub, Railway deploys
4. **Free Database** - PostgreSQL with no limits on free tier
5. **Fully Managed** - Railway handles everything

## Next Steps

1. Connect Railway to your GitHub repo
2. Add PostgreSQL database
3. Set environment variables
4. Push to `main` branch - deployment happens automatically!
5. Get your Railway URL and add it to GitHub secrets

That's it! No secrets, no tokens, everything connected via GitHub! 🚀

