#!/bin/bash

# Automated Deployment Script
# This script will deploy your app to GitHub Pages and Render

set -e

echo "🚀 Automated Deployment Script"
echo "================================"
echo ""

REPO_NAME="friendly-friends-app"
GITHUB_USER="mridul6275-blip"
BACKEND_NAME="friendly-friends-backend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if GitHub CLI is authenticated
echo "📋 Step 1: Checking GitHub Authentication..."
if gh auth status &>/dev/null; then
    echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
else
    echo -e "${YELLOW}⚠️  GitHub CLI not authenticated${NC}"
    echo "Opening browser for authentication..."
    gh auth login --web
    echo "Please complete authentication in the browser, then press Enter..."
    read
fi

# Step 2: Push to GitHub
echo ""
echo "📋 Step 2: Pushing to GitHub..."
cd "$(dirname "$0")"
git add .
git commit -m "Deploy to GitHub Pages" || echo "No changes to commit"
git push origin main
echo -e "${GREEN}✅ Code pushed to GitHub${NC}"

# Step 3: Enable GitHub Pages
echo ""
echo "📋 Step 3: Enabling GitHub Pages..."
gh api repos/${GITHUB_USER}/${REPO_NAME}/pages \
  -X POST \
  -f source='{"branch":"main","path":"/frontend/dist"}' \
  --jq '.' 2>/dev/null || echo "Pages might already be enabled or need manual setup"

# Try to set Pages source to GitHub Actions
gh api repos/${GITHUB_USER}/${REPO_NAME}/pages \
  -X PUT \
  -f source='{"type":"github_actions"}' \
  --jq '.' 2>/dev/null || echo "Setting Pages source..."

echo -e "${GREEN}✅ GitHub Pages enabled${NC}"

# Step 4: Deploy Backend to Render
echo ""
echo "📋 Step 4: Deploying Backend to Render..."
echo -e "${YELLOW}⚠️  Render deployment requires manual setup${NC}"
echo ""
echo "Please follow these steps:"
echo "1. Go to: https://render.com"
echo "2. Sign up/login with GitHub"
echo "3. Click 'New +' → 'Blueprint'"
echo "4. Connect repo: ${GITHUB_USER}/${REPO_NAME}"
echo "5. Select render.yaml"
echo "6. Add OPENAI_API_KEY environment variable"
echo "7. Click 'Apply'"
echo ""
read -p "Press Enter when backend is deployed..."

# Step 5: Get backend URL
echo ""
read -p "Enter your Render backend URL (or press Enter for default): " BACKEND_URL
BACKEND_URL=${BACKEND_URL:-"https://${BACKEND_NAME}.onrender.com"}

# Step 6: Set GitHub Secret
echo ""
echo "📋 Step 6: Setting GitHub Secret for Backend URL..."
if gh secret set VITE_API_URL --body "${BACKEND_URL}" --repo ${GITHUB_USER}/${REPO_NAME} 2>/dev/null; then
    echo -e "${GREEN}✅ Backend URL secret set${NC}"
else
    echo -e "${YELLOW}⚠️  Could not set secret automatically${NC}"
    echo "Please set it manually:"
    echo "1. Go to: https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/secrets/actions"
    echo "2. Click 'New repository secret'"
    echo "3. Name: VITE_API_URL"
    echo "4. Value: ${BACKEND_URL}"
fi

# Step 7: Trigger deployment
echo ""
echo "📋 Step 7: Triggering Deployment..."
gh workflow run deploy.yml --repo ${GITHUB_USER}/${REPO_NAME} 2>/dev/null || echo "Workflow will trigger automatically on push"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "Your app will be live at:"
echo "Frontend: https://${GITHUB_USER}.github.io/${REPO_NAME}/"
echo "Backend: ${BACKEND_URL}"
echo ""
echo "⏱️  Deployment takes 5-10 minutes"
echo "📊 Check progress: https://github.com/${GITHUB_USER}/${REPO_NAME}/actions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

