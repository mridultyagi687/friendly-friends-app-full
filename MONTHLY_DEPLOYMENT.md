# Monthly Backend Deployment Guide

## Quick Deployment Process

Your backend **automatically redeploys** whenever you push changes to GitHub!

### Simple 3-Step Process:

1. **Make your changes** to the backend code
2. **Test locally** (optional but recommended)
3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add new features for [month]"
   git push origin main
   ```

That's it! Render will automatically:
- Detect the push
- Build your backend
- Deploy the new version
- Usually takes 2-3 minutes

---

## Current Setup

- **Frontend**: GitHub Pages (auto-deploys on push)
- **Backend**: Render (auto-deploys on push to `main` branch)
- **Database**: Neon PostgreSQL (persistent, no redeploy needed)

---

## Before Monthly Deployment

### ✅ Checklist:

- [ ] Test changes locally if possible
- [ ] Review what features you're adding
- [ ] Make sure `requirements.txt` is updated if you added new Python packages
- [ ] Commit and push to `main` branch
- [ ] Wait 2-3 minutes for Render to deploy
- [ ] Test the live backend to verify it works

---

## Monitoring Deployments

### Check Render Dashboard:
- **URL**: https://dashboard.render.com
- **Service**: `friendly-friends-backend`
- **Logs**: Click "Logs" tab to see deployment progress
- **Status**: Green = live, Yellow = deploying, Red = error

### Check Deployment Status:
1. Go to Render dashboard
2. Click your service
3. Look at "Events" tab to see deployment history
4. Check "Logs" tab for any errors

---

## Common Issues & Quick Fixes

### Issue: Deployment fails
- **Check**: Render logs for error messages
- **Common causes**: 
  - Missing dependencies in `requirements.txt`
  - Syntax errors in code
  - Database connection issues

### Issue: Backend not responding
- **Check**: Render logs for runtime errors
- **Common causes**:
  - Database connection string changed
  - Environment variables missing
  - Port binding issues

### Issue: Database errors
- **Check**: Neon dashboard to ensure database is running
- **Verify**: `DATABASE_URL` in Render environment variables is correct

---

## Environment Variables (Don't Change These)

These are already set in Render and should stay the same:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `FLASK_SECRET_KEY` - Session encryption key
- `FRONTEND_URL` - Your GitHub Pages URL
- `OPENAI_API_KEY` - For AI features (if you use them)
- `FLASK_ENV` - Set to `production`
- `APP_ENV` - Set to `production`

**⚠️ Don't modify these unless you know what you're doing!**

---

## Database Updates

If you need to update the database schema:

1. **Add new models** in `backend/app.py`
2. **Push to GitHub** - tables will auto-create on next deployment
3. **Or manually run** migration scripts if needed

The app automatically creates missing tables on startup, so schema changes are usually handled automatically.

---

## Rollback (If Something Breaks)

If a deployment breaks:

1. **Go to Render Dashboard**
2. **Click your service**
3. **Click "Manual Deploy"**
4. **Select a previous commit** from the dropdown
5. **Click "Deploy"**

This will redeploy a previous working version.

---

## Monthly Workflow Example

```
Week 1-3: Develop new features locally
Week 4: Test everything
End of Month: 
  1. git add .
  2. git commit -m "Monthly update: [feature list]"
  3. git push origin main
  4. Wait 2-3 minutes
  5. Test live site
  6. Done! ✅
```

---

## Tips

- **Small, frequent commits** are better than one big commit at the end
- **Test locally first** if possible (run `python backend/app.py`)
- **Check Render logs** after deployment to catch errors early
- **Keep a changelog** of what features you added each month

---

## Need Help?

If something goes wrong:
1. Check Render logs first
2. Check GitHub Actions (if tests fail)
3. Verify environment variables in Render
4. Check Neon database is accessible

Your setup is fully automated - just push to GitHub and Render handles the rest! 🚀

