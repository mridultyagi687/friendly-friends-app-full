#!/bin/bash

# Quick Deploy Script - Deploy to GitHub Pages
# This script will push your code to GitHub and set up deployment

echo "🚀 Deploying Friendly Friends App to GitHub Pages"
echo "=================================================="
echo ""

# Check if we're in a git repo
if [ ! -d .git ]; then
    echo "❌ Not a git repository!"
    exit 1
fi

# Check if backend is deployed
echo "📋 Step 1: Backend Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Backend must be deployed first!"
echo ""
echo "Option A: Deploy to Render (Recommended - Free)"
echo "  1. Go to https://render.com"
echo "  2. Sign up/login with GitHub"
echo "  3. Click 'New +' → 'Blueprint'"
echo "  4. Connect repo: mridul6275-blip/friendly-friends-app"
echo "  5. Select render.yaml"
echo "  6. Add OPENAI_API_KEY in Environment Variables"
echo "  7. Click 'Apply'"
echo ""
echo "Your backend URL will be: https://friendly-friends-backend.onrender.com"
echo ""
read -p "Have you deployed the backend? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please deploy the backend first, then run this script again."
    exit 1
fi

read -p "Enter your backend URL (or press Enter for default): " BACKEND_URL
BACKEND_URL=${BACKEND_URL:-"https://friendly-friends-backend.onrender.com"}

echo ""
echo "📋 Step 2: Push to GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Add all files
echo "📦 Adding files..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "Deploy to GitHub Pages" || echo "No changes to commit"

# Push
echo "🚀 Pushing to GitHub..."
echo ""
echo "⚠️  You may be prompted for GitHub credentials"
echo ""

if git push origin main; then
    echo ""
    echo "✅ Code pushed successfully!"
else
    echo ""
    echo "❌ Push failed. You may need to:"
    echo "   1. Set up GitHub authentication (SSH key or Personal Access Token)"
    echo "   2. Or run: git push origin main (manually)"
    exit 1
fi

echo ""
echo "📋 Step 3: Enable GitHub Pages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to: https://github.com/mridul6275-blip/friendly-friends-app/settings/pages"
echo "2. Under 'Source', select 'GitHub Actions'"
echo "3. Save"
echo ""

echo "📋 Step 4: Set Backend URL Secret (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If your backend URL is different, set it as a secret:"
echo "1. Go to: https://github.com/mridul6275-blip/friendly-friends-app/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: VITE_API_URL"
echo "4. Value: $BACKEND_URL"
echo "5. Click 'Add secret'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Started!"
echo ""
echo "Your app will be live at:"
echo "https://mridul6275-blip.github.io/friendly-friends-app/"
echo ""
echo "⏱️  Deployment takes 5-10 minutes"
echo "📊 Check progress: https://github.com/mridul6275-blip/friendly-friends-app/actions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

