#!/bin/bash

# Frontend deployment script for Friendly Friends App

echo "🚀 Starting frontend deployment..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🔨 Building for production..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build files are in frontend/dist/"
    echo ""
    echo "🌐 To deploy to GitHub Pages:"
    echo "   1. Copy contents of frontend/dist/ to your GitHub Pages repository"
    echo "   2. Or use: npm run deploy (if configured)"
    echo ""
    echo "🔧 Backend URL configured for: https://friendly-friends-app-full.onrender.com"
else
    echo "❌ Build failed!"
    exit 1
fi