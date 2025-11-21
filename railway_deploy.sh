#!/bin/bash

# Railway Deployment Script
# This script helps you deploy your app to Railway

echo "🚀 Railway Deployment Guide"
echo "=========================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm i -g @railway/cli
    echo ""
fi

echo "✅ Railway CLI is installed"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway:"
    railway login
    echo ""
fi

echo "📋 Choose what to deploy:"
echo "1. Backend only (Flask/Python)"
echo "2. Frontend only (React/Vite)"
echo "3. Both (separate services)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying Backend..."
        cd backend
        
        if [ ! -f ".railway" ]; then
            echo "📋 Initializing Railway project..."
            railway init
        fi
        
        echo ""
        echo "📋 Deploying..."
        railway up
        
        echo ""
        echo "✅ Backend deployed!"
        echo "📋 Your backend URL: https://your-project.up.railway.app"
        echo ""
        echo "💡 Don't forget to set environment variables:"
        echo "   - OPENAI_API_KEY"
        echo "   - FLASK_SECRET_KEY"
        echo "   - PORT (Railway sets this automatically)"
        ;;
    2)
        echo ""
        echo "🚀 Deploying Frontend..."
        cd frontend
        
        if [ ! -f ".railway" ]; then
            echo "📋 Initializing Railway project..."
            railway init
        fi
        
        echo ""
        echo "📋 Building and deploying..."
        railway up
        
        echo ""
        echo "✅ Frontend deployed!"
        echo "📋 Your frontend URL: https://your-project.up.railway.app"
        ;;
    3)
        echo ""
        echo "🚀 Deploying Backend first..."
        cd backend
        
        if [ ! -f ".railway" ]; then
            echo "📋 Initializing Railway project..."
            railway init
        fi
        
        railway up
        
        echo ""
        echo "✅ Backend deployed!"
        BACKEND_URL=$(railway domain 2>/dev/null || echo "https://your-backend.up.railway.app")
        echo "📋 Backend URL: $BACKEND_URL"
        
        echo ""
        echo "🚀 Deploying Frontend..."
        cd ../frontend
        
        if [ ! -f ".railway" ]; then
            echo "📋 Initializing Railway project..."
            railway init
        fi
        
        echo ""
        echo "💡 Setting VITE_API_URL environment variable..."
        railway variables set VITE_API_URL=$BACKEND_URL
        
        railway up
        
        echo ""
        echo "✅ Frontend deployed!"
        FRONTEND_URL=$(railway domain 2>/dev/null || echo "https://your-frontend.up.railway.app")
        echo "📋 Frontend URL: $FRONTEND_URL"
        echo ""
        echo "🎉 Deployment complete!"
        echo "Frontend: $FRONTEND_URL"
        echo "Backend: $BACKEND_URL"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📚 For more info, visit: https://docs.railway.app"

