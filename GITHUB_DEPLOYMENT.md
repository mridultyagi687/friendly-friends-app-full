# GitHub-Only Deployment Guide

This guide shows how to deploy both frontend and backend using only GitHub services.

## Architecture

- **Frontend**: GitHub Pages (free, automatic)
- **Backend**: Fly.io (free tier, deployed via GitHub Actions)
- **Database**: SQLite on Fly.io (or PostgreSQL add-on)

## Prerequisites

1. GitHub account with repository: `friendly-friends-app-full`
2. Fly.io account (free tier) at https://fly.io
3. GitHub Pages enabled

## Step 1: Enable GitHub Pages

1. Go to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/pages
2. Under **Source**, select **GitHub Actions**
3. Done! Frontend deploys automatically on push to `main`

## Step 2: Set Up Fly.io (One-Time Setup)

1. **Sign up at Fly.io**: https://fly.io (free tier available)

2. **Install Fly CLI** (optional, for manual testing):
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

3. **Login to Fly.io**:
   ```bash
   flyctl auth login
   ```

4. **Create Fly.io App** (if not already created):
   ```bash
   cd "/Users/mridul/Documents/Friendly Friends App"
   flyctl apps create friendly-friends-backend
   ```

5. **Get Fly.io API Token**:
   - Go to: https://fly.io/user/personal_access_tokens
   - Click **Create Token**
   - Copy the token

6. **Add Token to GitHub Secrets**:
   - Go to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/secrets/actions
   - Click **New repository secret**
   - Name: `FLY_API_TOKEN`
   - Value: Paste your Fly.io API token

## Step 3: Configure Environment Variables

1. **Set Fly.io Secrets** (for production):
   ```bash
   flyctl secrets set FLASK_SECRET_KEY="your-secret-key-here" -a friendly-friends-backend
   flyctl secrets set FRONTEND_URL="https://mridultyagi687.github.io/friendly-friends-app-full" -a friendly-friends-backend
   flyctl secrets set APP_ENV="production" -a friendly-friends-backend
   flyctl secrets set SESSION_COOKIE_SECURE="true" -a friendly-friends-backend
   ```

   Or set them in Fly.io dashboard:
   - Go to: https://fly.io/apps/friendly-friends-backend/settings/secrets
   - Add each secret

2. **Optional: Add PostgreSQL** (for cloud database):
   ```bash
   flyctl postgres create --name friendly-friends-db --region iad
   flyctl postgres attach friendly-friends-db -a friendly-friends-backend
   ```
   This automatically sets `DATABASE_URL` environment variable.

## Step 4: Deploy Backend

The backend will automatically deploy via GitHub Actions when you push to `main` branch.

**Manual deployment** (optional):
```bash
flyctl deploy
```

## Step 5: Update Frontend API URL

1. Go to: https://github.com/mridultyagi687/friendly-friends-app-full/settings/secrets/actions
2. Add secret:
   - Name: `VITE_API_URL`
   - Value: `https://friendly-friends-backend.fly.dev` (or your Fly.io app URL)

## Step 6: Verify Deployment

1. **Frontend**: https://mridultyagi687.github.io/friendly-friends-app-full
2. **Backend**: https://friendly-friends-backend.fly.dev
3. **Health Check**: https://friendly-friends-backend.fly.dev/api/health

## Automatic Deployment

- **Frontend**: Deploys automatically on push to `main` (via `.github/workflows/deploy.yml`)
- **Backend**: Deploys automatically on push to `main` when `backend/` files change (via `.github/workflows/deploy-backend.yml`)

## Environment Variables

### Fly.io Secrets (Backend)
- `FLASK_SECRET_KEY`: Secret key for Flask sessions
- `FRONTEND_URL`: Your GitHub Pages URL
- `APP_ENV`: Set to `production`
- `SESSION_COOKIE_SECURE`: Set to `true`
- `DATABASE_URL`: Auto-set if using Fly.io PostgreSQL
- `OPENAI_API_KEY`: Your OpenAI API key (optional)

### GitHub Secrets (Frontend Build)
- `VITE_API_URL`: Your Fly.io backend URL

## Database Options

### Option 1: SQLite (Default, Free)
- Uses SQLite file on Fly.io filesystem
- Data persists as long as the app is running
- Good for development/testing

### Option 2: PostgreSQL (Recommended for Production)
- Managed PostgreSQL on Fly.io
- More reliable, better for production
- Free tier available
- Set up with: `flyctl postgres create`

## Troubleshooting

### Backend not deploying
- Check GitHub Actions workflow status
- Verify `FLY_API_TOKEN` secret is set correctly
- Check Fly.io app exists: `flyctl apps list`

### Frontend can't connect to backend
- Verify `VITE_API_URL` secret matches your Fly.io URL
- Check CORS settings in `backend/app.py`
- Verify `FRONTEND_URL` is set in Fly.io secrets

### Database issues
- If using SQLite: Data is stored on Fly.io filesystem
- If using PostgreSQL: Check `DATABASE_URL` is set
- View logs: `flyctl logs -a friendly-friends-backend`

## Viewing Logs

```bash
# Backend logs
flyctl logs -a friendly-friends-backend

# Follow logs in real-time
flyctl logs -a friendly-friends-backend --follow
```

## Scaling

Fly.io free tier includes:
- 3 shared-cpu-1x VMs
- 256MB RAM per VM
- 3GB persistent volume storage

For more resources, upgrade to paid plans.

## All GitHub-Managed

✅ Frontend: GitHub Pages (automatic)  
✅ Backend Deployment: GitHub Actions → Fly.io  
✅ Database: Fly.io (SQLite or PostgreSQL)  
✅ Everything managed through GitHub!

