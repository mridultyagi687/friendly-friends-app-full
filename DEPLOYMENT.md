# Deployment Guide

This guide explains how to deploy the Friendly Friends App to GitHub Pages (frontend) and Render (backend) with a cloud database.

## Architecture

- **Frontend**: Deployed to GitHub Pages at `https://mridultyagi687.github.io/friendly-friends-app-full`
- **Backend**: Deployed to Render (or similar cloud service)
- **Database**: PostgreSQL on Render (cloud-hosted, not stored locally)

## Prerequisites

1. GitHub account with repository: `friendly-friends-app-full`
2. Render account (free tier available) at https://render.com
3. GitHub Pages enabled in repository settings

## Step 1: Enable GitHub Pages

1. Go to your repository: https://github.com/mridultyagi687/friendly-friends-app-full
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The deployment workflow will automatically run on pushes to `main` branch

## Step 2: Deploy Backend to Render

1. Sign up/Login at https://render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository: `friendly-friends-app-full`
4. Configure the service:
   - **Name**: `friendly-friends-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r backend/requirements.txt && pip install gunicorn`
   - **Start Command**: `cd backend && gunicorn -w 2 -b 0.0.0.0:$PORT app:app`
   - **Plan**: Free

5. Add Environment Variables:
   - `FLASK_ENV=production`
   - `APP_ENV=production`
   - `SESSION_COOKIE_SECURE=true`
   - `FRONTEND_URL=https://mridultyagi687.github.io/friendly-friends-app-full`
   - `FLASK_SECRET_KEY` (generate a secure random string)
   - `OPENAI_API_KEY` (your OpenAI API key if using AI features)
   - `DATABASE_URL` (will be set automatically when you create the database)

## Step 3: Create PostgreSQL Database on Render

1. In Render dashboard, click **New +** → **PostgreSQL**
2. Configure:
   - **Name**: `friendly-friends-db`
   - **Database**: `friendly_friends`
   - **User**: `friendly_friends_user`
   - **Plan**: Free
3. After creation, copy the **Internal Database URL**
4. Go back to your Web Service settings
5. Add environment variable:
   - Key: `DATABASE_URL`
   - Value: Paste the Internal Database URL from the database

## Step 4: Configure GitHub Secrets

1. Go to repository → **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://friendly-friends-backend.onrender.com`)

## Step 5: Initialize Database

After deployment, the database will be automatically initialized when the app first runs. The Flask app will create all necessary tables.

To manually initialize:
1. SSH into your Render service (if available) or use Render's shell
2. Run: `cd backend && python -c "from app import app, db; app.app_context().push(); db.create_all()"`

## Step 6: Verify Deployment

1. **Frontend**: Visit `https://mridultyagi687.github.io/friendly-friends-app-full`
2. **Backend**: Visit your Render service URL (e.g., `https://friendly-friends-backend.onrender.com/api/health`)
3. Test the connection between frontend and backend

## Environment Variables Reference

### Backend (Render)
- `DATABASE_URL`: PostgreSQL connection string (auto-set by Render)
- `FLASK_SECRET_KEY`: Secret key for Flask sessions
- `FLASK_ENV`: Set to `production`
- `APP_ENV`: Set to `production`
- `SESSION_COOKIE_SECURE`: Set to `true` for HTTPS
- `FRONTEND_URL`: Your GitHub Pages URL
- `OPENAI_API_KEY`: Your OpenAI API key (optional)

### Frontend (GitHub Actions)
- `VITE_API_URL`: Your Render backend URL (set as GitHub secret)

## Troubleshooting

### Frontend can't connect to backend
- Check CORS settings in `backend/app.py`
- Verify `FRONTEND_URL` environment variable matches your GitHub Pages URL
- Check browser console for CORS errors

### Database connection issues
- Verify `DATABASE_URL` is set correctly in Render
- Check Render logs for database connection errors
- Ensure PostgreSQL service is running

### Session/cookie issues
- Ensure `SESSION_COOKIE_SECURE=true` in production
- Verify `FRONTEND_URL` is set correctly
- Check that both frontend and backend use HTTPS

## Updating the Deployment

- **Frontend**: Push to `main` branch, GitHub Actions will automatically deploy
- **Backend**: Push to `main` branch, Render will automatically redeploy (if auto-deploy is enabled)

## Local Development

For local development, the app will automatically use SQLite. The cloud database is only used when `DATABASE_URL` environment variable is set.

## Notes

- Free tier on Render may spin down after inactivity (takes ~30 seconds to wake up)
- GitHub Pages is free and always available
- Database is stored in Render's cloud, not on your local machine
- All file uploads are stored in Render's filesystem (consider using cloud storage for production)

